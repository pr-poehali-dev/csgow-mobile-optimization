/**
 * Business: Multiplayer server for real-time game sessions
 * Args: event with httpMethod, headers, body
 * Returns: Game state and room management
 */

const rooms = new Map();
const connections = new Map();

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function handler(event, context) {
    const { httpMethod } = event;
    
    if (httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            body: ''
        };
    }
    
    if (httpMethod === 'POST') {
        const body = JSON.parse(event.body || '{}');
        const action = body.action;
        
        if (action === 'create_room') {
            const roomId = generateRoomId();
            const room = {
                id: roomId,
                players: new Map(),
                maxPlayers: 10,
                createdAt: Date.now()
            };
            rooms.set(roomId, room);
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    roomId,
                    maxPlayers: room.maxPlayers
                })
            };
        }
        
        if (action === 'get_rooms') {
            const activeRooms = Array.from(rooms.values()).map(room => ({
                id: room.id,
                players: room.players.size,
                maxPlayers: room.maxPlayers
            }));
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    rooms: activeRooms
                })
            };
        }
        
        if (action === 'join_room') {
            const { roomId, playerId, username } = body;
            const room = rooms.get(roomId);
            
            if (!room) {
                return {
                    statusCode: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Room not found'
                    })
                };
            }
            
            if (room.players.size >= room.maxPlayers) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        error: 'Room is full'
                    })
                };
            }
            
            const player = {
                id: playerId,
                username,
                position: { x: 0, y: 1.6, z: 10 },
                rotation: 0,
                health: 100,
                kills: 0,
                deaths: 0
            };
            
            room.players.set(playerId, player);
            
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    player,
                    players: Array.from(room.players.values())
                })
            };
        }
        
        if (action === 'update_position') {
            const { roomId, playerId, position, rotation } = body;
            const room = rooms.get(roomId);
            
            if (room && room.players.has(playerId)) {
                const player = room.players.get(playerId);
                player.position = position;
                player.rotation = rotation;
                
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        players: Array.from(room.players.values())
                    })
                };
            }
            
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Player or room not found'
                })
            };
        }
        
        if (action === 'shoot') {
            const { roomId, playerId, targetId } = body;
            const room = rooms.get(roomId);
            
            if (room && room.players.has(targetId)) {
                const target = room.players.get(targetId);
                target.health -= 34;
                
                if (target.health <= 0) {
                    target.health = 0;
                    target.deaths += 1;
                    
                    if (room.players.has(playerId)) {
                        const shooter = room.players.get(playerId);
                        shooter.kills += 1;
                    }
                    
                    setTimeout(() => {
                        target.health = 100;
                        target.position = { 
                            x: (Math.random() - 0.5) * 20, 
                            y: 1.6, 
                            z: (Math.random() - 0.5) * 20 
                        };
                    }, 3000);
                }
                
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        players: Array.from(room.players.values())
                    })
                };
            }
            
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Target not found'
                })
            };
        }
        
        if (action === 'leave_room') {
            const { roomId, playerId } = body;
            const room = rooms.get(roomId);
            
            if (room) {
                room.players.delete(playerId);
                
                if (room.players.size === 0) {
                    rooms.delete(roomId);
                }
                
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true
                    })
                };
            }
        }
    }
    
    if (httpMethod === 'GET') {
        const params = event.queryStringParameters || {};
        const action = params.action;
        
        if (action === 'get_state') {
            const roomId = params.roomId;
            const room = rooms.get(roomId || '');
            
            if (room) {
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: true,
                        players: Array.from(room.players.values())
                    })
                };
            }
        }
    }
    
    return {
        statusCode: 400,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: false,
            error: 'Invalid action'
        })
    };
}
