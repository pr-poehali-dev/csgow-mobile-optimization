import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from './ui/button';
import Icon from './ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  health: number;
  kills: number;
  deaths: number;
}

interface OtherPlayerProps {
  player: Player;
  isLocalPlayer: boolean;
}

function OtherPlayer({ player, isLocalPlayer }: OtherPlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || isLocalPlayer) return;
    groupRef.current.position.set(player.position.x, player.position.y, player.position.z);
    groupRef.current.rotation.y = player.rotation;
  });

  if (isLocalPlayer) return null;

  return (
    <group ref={groupRef} position={[player.position.x, player.position.y, player.position.z]}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial color="#F97316" />
      </mesh>
      <mesh position={[0, 0.6, 0.2]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#1A1F2C" />
      </mesh>
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.3}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        {player.username}
      </Text>
      <pointLight position={[0, 2, 0]} intensity={0.3} color="#F97316" distance={3} />
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#1A1F2C" />
    </mesh>
  );
}

function Wall({ position, rotation, width = 10, height = 5 }: any) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, 0.5]} />
      <meshStandardMaterial color="#2D3748" />
    </mesh>
  );
}

function Box({ position, color = '#0EA5E9' }: any) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

interface GameSceneProps {
  players: Player[];
  localPlayerId: string;
  onPositionUpdate: (position: { x: number; y: number; z: number }, rotation: number) => void;
  isMobile: boolean;
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

function GameScene({ players, localPlayerId, onPositionUpdate, isMobile, moveForward, moveBackward, moveLeft, moveRight }: GameSceneProps) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const lastUpdate = useRef(Date.now());

  useFrame(() => {
    const speed = 0.1;
    velocity.current.set(0, 0, 0);

    if (isMobile) {
      if (moveForward) velocity.current.z -= speed;
      if (moveBackward) velocity.current.z += speed;
      if (moveLeft) velocity.current.x -= speed;
      if (moveRight) velocity.current.x += speed;
      camera.position.add(velocity.current);
    }

    camera.position.y = 1.6;

    if (Date.now() - lastUpdate.current > 50) {
      onPositionUpdate(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        camera.rotation.y
      );
      lastUpdate.current = Date.now();
    }
  });

  useEffect(() => {
    camera.position.set(0, 1.6, 10);
  }, [camera]);

  return (
    <>
      <Sky sunPosition={[100, 100, 100]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#F97316" />

      <Ground />

      <Wall position={[0, 2.5, -20]} rotation={[0, 0, 0]} width={40} />
      <Wall position={[0, 2.5, 20]} rotation={[0, 0, 0]} width={40} />
      <Wall position={[-20, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={40} />
      <Wall position={[20, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={40} />

      <Box position={[-5, 1, -5]} color="#F97316" />
      <Box position={[5, 1, -5]} color="#0EA5E9" />
      <Box position={[-5, 1, 5]} color="#0EA5E9" />
      <Box position={[5, 1, 5]} color="#F97316" />

      <Box position={[0, 1, -10]} color="#2D3748" />
      <Box position={[-8, 1, 0]} color="#2D3748" />
      <Box position={[8, 1, 0]} color="#2D3748" />

      {players.map((player) => (
        <OtherPlayer 
          key={player.id} 
          player={player} 
          isLocalPlayer={player.id === localPlayerId}
        />
      ))}

      {!isMobile && <PointerLockControls />}
    </>
  );
}

interface MultiplayerGameProps {
  onExit: () => void;
  roomId: string;
  user: { id: number; username: string };
}

export default function MultiplayerGame({ onExit, roomId, user }: MultiplayerGameProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [ammo, setAmmo] = useState(30);
  const [health, setHealth] = useState(100);
  const [isMobile, setIsMobile] = useState(false);
  const [hitmarker, setHitmarker] = useState(false);

  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);

  const { toast } = useToast();
  const localPlayerId = useRef(`player_${user.id}`);
  const updateInterval = useRef<number | null>(null);

  const shootSound = useRef<HTMLAudioElement | null>(null);
  const hitSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    
    shootSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApJn+DyvmwhBSuBzvLZiTYIG2m98OScTQwOU6rk8rNfGAU7k9nzzXksBSl7yPDajkULElyx6OyrUxMNTKXh8rZjHAU2j9Tv0ogxBylz0PDhlkAMFGS56+mjUBELQZnf8LxsIQUqfs7y3Ik2CBxpvfDlm0wMDlOo5PKwXhgFOpPY88t6LAUpfM3w2Y9FCxJcsejtrFMTDUyn4POxYhwFNY/U7tWHMgcrdc/w4ZVBDBVlu+vpo1ARC0GZ3/C6ayEFKn/O8t2INgcbab3w55xPDA5Tp+TysV4YBTmT2fPKfSwFKX/N8NiQRQwSXLHo7axTEw1Mp+DzsGIcBTOO1e7VhzUGLHjN8OGXRAwRZLrr6aJQEgpFm9/wvGwhBSt/zvLciT');
    hitSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApJn+DyvmwhBSuBzvLZiTYIG2m98OScTQwOU6rk8rNfGAU7k9nzzXksBSl7yPDajkULElyx6OyrUxMNTKXh8rZjHAU2j9Tv0ogxBylz0PDhlkAMFGS56+mjUBELQZnf8LxsIQUqfs7y3Ik2CBxpvfDlm0wMDlOo5PKwXhgFOpPY88t6LAUpfM3w2Y9FCxJcsejtrFMTDUyn4POxYhwFNY/U7tWHMgcrdc/w4ZVBDBVlu+vpo1ARC0GZ3/C6ayEFKn/O8t2INgcbab3w55xPDA5Tp+TysV4YBTmT2fPKfSwFKX/N8NiQRQwSXLHo7axTEw1Mp+DzsGIcBTOO1e7VhzUGLHjN8OGXRAwRZLrr6aJQEgpFm9/wvGwhBSt/zvLciT');

    joinRoom();

    updateInterval.current = window.setInterval(() => {
      fetchGameState();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setMoveForward(true); break;
        case 'KeyS': setMoveBackward(true); break;
        case 'KeyA': setMoveLeft(true); break;
        case 'KeyD': setMoveRight(true); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setMoveForward(false); break;
        case 'KeyS': setMoveBackward(false); break;
        case 'KeyA': setMoveLeft(false); break;
        case 'KeyD': setMoveRight(false); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (updateInterval.current) clearInterval(updateInterval.current);
      leaveRoom();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const joinRoom = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/487098f8-e21c-4c5d-9ced-cc62e56ea07a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_room',
          roomId,
          playerId: localPlayerId.current,
          username: user.username
        })
      });
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
        toast({
          title: 'Подключено!',
          description: `Игроков в комнате: ${data.players.length}`
        });
      }
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const leaveRoom = async () => {
    try {
      await fetch('https://functions.poehali.dev/487098f8-e21c-4c5d-9ced-cc62e56ea07a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave_room',
          roomId,
          playerId: localPlayerId.current
        })
      });
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  };

  const fetchGameState = async () => {
    try {
      const response = await fetch(`https://functions.poehali.dev/487098f8-e21c-4c5d-9ced-cc62e56ea07a?action=get_state&roomId=${roomId}`);
      const data = await response.json();
      if (data.success) {
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  };

  const handlePositionUpdate = async (position: { x: number; y: number; z: number }, rotation: number) => {
    try {
      await fetch('https://functions.poehali.dev/487098f8-e21c-4c5d-9ced-cc62e56ea07a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_position',
          roomId,
          playerId: localPlayerId.current,
          position,
          rotation
        })
      });
    } catch (error) {
      console.error('Failed to update position:', error);
    }
  };

  const handleShoot = async () => {
    if (ammo <= 0) return;

    setAmmo(ammo - 1);
    shootSound.current?.play().catch(() => {});

    const nearestPlayer = players
      .filter(p => p.id !== localPlayerId.current && p.health > 0)
      .sort((a, b) => {
        const distA = Math.sqrt(a.position.x ** 2 + a.position.z ** 2);
        const distB = Math.sqrt(b.position.x ** 2 + b.position.z ** 2);
        return distA - distB;
      })[0];

    if (nearestPlayer && Math.random() > 0.5) {
      hitSound.current?.play().catch(() => {});
      setHitmarker(true);
      setTimeout(() => setHitmarker(false), 200);

      try {
        await fetch('https://functions.poehali.dev/487098f8-e21c-4c5d-9ced-cc62e56ea07a', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'shoot',
            roomId,
            playerId: localPlayerId.current,
            targetId: nearestPlayer.id
          })
        });
      } catch (error) {
        console.error('Failed to shoot:', error);
      }
    }
  };

  const reload = () => setAmmo(30);

  const localPlayer = players.find(p => p.id === localPlayerId.current);

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        onClick={handleShoot}
      >
        <GameScene
          players={players}
          localPlayerId={localPlayerId.current}
          onPositionUpdate={handlePositionUpdate}
          isMobile={isMobile}
          moveForward={moveForward}
          moveBackward={moveBackward}
          moveLeft={moveLeft}
          moveRight={moveRight}
        />
      </Canvas>

      <div className="fixed top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="bg-card/80 backdrop-blur p-4 rounded border border-border pointer-events-auto">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Icon name="Users" className="text-secondary" />
              <span className="font-bold text-xl">{players.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Heart" className="text-destructive" />
              <span className="font-bold text-xl">{health}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Zap" className="text-primary" />
              <span className="font-bold text-xl">{ammo}/30</span>
            </div>
            {localPlayer && (
              <div className="flex items-center space-x-2">
                <Icon name="Target" className="text-secondary" />
                <span className="font-bold text-xl">{localPlayer.kills}/{localPlayer.deaths}</span>
              </div>
            )}
          </div>
          {ammo === 0 && (
            <Button onClick={reload} className="mt-2 w-full" size="sm">
              <Icon name="RotateCw" className="mr-1" size={16} />
              Reload
            </Button>
          )}
        </div>

        <Button onClick={onExit} variant="destructive" className="pointer-events-auto">
          <Icon name="X" className="mr-2" />
          Выход
        </Button>
      </div>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className={`w-6 h-6 border-2 rounded-full transition-all ${hitmarker ? 'border-destructive scale-150' : 'border-primary'}`} />
        <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-primary -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-4 h-0.5 bg-primary -translate-x-1/2 -translate-y-1/2" />
        {hitmarker && (
          <>
            <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-destructive rotate-45 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-3 h-0.5 bg-destructive -rotate-45 -translate-x-1/2 -translate-y-1/2" />
          </>
        )}
      </div>

      {isMobile && (
        <>
          <div className="fixed bottom-8 left-8 w-32 h-32 z-10">
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-muted/50 backdrop-blur rounded-full border-2 border-border" />
              
              <button
                onTouchStart={() => setMoveForward(true)}
                onTouchEnd={() => setMoveForward(false)}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary/50 rounded-full flex items-center justify-center active:bg-primary"
              >
                <Icon name="ChevronUp" />
              </button>
              
              <button
                onTouchStart={() => setMoveBackward(true)}
                onTouchEnd={() => setMoveBackward(false)}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary/50 rounded-full flex items-center justify-center active:bg-primary"
              >
                <Icon name="ChevronDown" />
              </button>
              
              <button
                onTouchStart={() => setMoveLeft(true)}
                onTouchEnd={() => setMoveLeft(false)}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary/50 rounded-full flex items-center justify-center active:bg-primary"
              >
                <Icon name="ChevronLeft" />
              </button>
              
              <button
                onTouchStart={() => setMoveRight(true)}
                onTouchEnd={() => setMoveRight(false)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary/50 rounded-full flex items-center justify-center active:bg-primary"
              >
                <Icon name="ChevronRight" />
              </button>
            </div>
          </div>

          <button
            onTouchStart={handleShoot}
            className="fixed bottom-8 right-8 w-20 h-20 bg-destructive rounded-full flex items-center justify-center z-10 active:scale-95 transition-transform shadow-lg"
          >
            <Icon name="Target" size={32} />
          </button>

          {ammo === 0 && (
            <button
              onClick={reload}
              className="fixed bottom-32 right-8 w-16 h-16 bg-primary rounded-full flex items-center justify-center z-10 active:scale-95 transition-transform shadow-lg"
            >
              <Icon name="RotateCw" size={24} />
            </button>
          )}
        </>
      )}

      {!isMobile && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur px-6 py-3 rounded border border-border z-10 pointer-events-none">
          <p className="text-sm text-muted-foreground">
            Комната: {roomId} • Игроков: {players.length} • WASD - движение • ЛКМ - стрельба • R - перезарядка
          </p>
        </div>
      )}
    </div>
  );
}
