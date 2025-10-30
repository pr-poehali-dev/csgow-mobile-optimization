'''
Business: User registration, login, and profile management for CS2 shooter
Args: event with httpMethod, body, queryStringParameters
Returns: HTTP response with user data or error
'''

import json
import os
import hashlib
from typing import Dict, Any, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor

@dataclass
class User:
    id: int
    username: str
    balance: int

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            if action == 'register':
                username = body_data.get('username')
                password = body_data.get('password')
                
                if not username or not password:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Username and password required'})
                    }
                
                hashed_pw = hash_password(password)
                
                cur.execute(
                    "INSERT INTO users (username, password, balance) VALUES (%s, %s, %s) RETURNING id, username, balance",
                    (username, hashed_pw, 1000)
                )
                user = cur.fetchone()
                conn.commit()
                
                cur.execute(
                    "INSERT INTO game_stats (user_id) VALUES (%s)",
                    (user['id'],)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'balance': user['balance']
                        }
                    })
                }
            
            elif action == 'login':
                username = body_data.get('username')
                password = body_data.get('password')
                
                if not username or not password:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Username and password required'})
                    }
                
                hashed_pw = hash_password(password)
                
                cur.execute(
                    "SELECT id, username, balance FROM users WHERE username = %s AND password = %s",
                    (username, hashed_pw)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid credentials'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'balance': user['balance']
                        }
                    })
                }
            
            elif action == 'profile':
                user_id = body_data.get('userId')
                
                cur.execute(
                    "SELECT u.id, u.username, u.balance, g.kills, g.deaths, g.wins, g.losses FROM users u LEFT JOIN game_stats g ON u.id = g.user_id WHERE u.id = %s",
                    (user_id,)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'user': dict(user)
                    })
                }
        
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            return {
                'statusCode': 409,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Username already exists'})
            }
        finally:
            cur.close()
            conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }
