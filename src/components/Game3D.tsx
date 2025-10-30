import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from './ui/button';
import Icon from './ui/icon';

interface Bot {
  id: number;
  position: THREE.Vector3;
  rotation: number;
  health: number;
  isDead: boolean;
  target: THREE.Vector3;
}

interface BotEnemyProps {
  bot: Bot;
  onHit: (id: number) => void;
}

function BotEnemy({ bot, onHit }: BotEnemyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || bot.isDead) return;

    const direction = new THREE.Vector3().subVectors(bot.target, bot.position).normalize();
    bot.position.add(direction.multiplyScalar(0.02));

    if (bot.position.distanceTo(bot.target) < 1) {
      bot.target.set(
        (Math.random() - 0.5) * 30,
        0.9,
        (Math.random() - 0.5) * 30
      );
    }

    bot.rotation = Math.atan2(direction.x, direction.z);
    groupRef.current.position.copy(bot.position);
    groupRef.current.rotation.y = bot.rotation;
  });

  if (bot.isDead) return null;

  return (
    <group ref={groupRef} position={bot.position}>
      <mesh ref={meshRef} position={[0, 0.9, 0]}>
        <boxGeometry args={[0.6, 1.8, 0.4]} />
        <meshStandardMaterial color="#0EA5E9" />
      </mesh>
      <mesh position={[0, 1.5, 0.2]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#1A1F2C" />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={0.3} color="#0EA5E9" distance={3} />
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
  bots: Bot[];
  onBotHit: (id: number) => void;
  isMobile: boolean;
  moveForward: boolean;
  moveBackward: boolean;
  moveLeft: boolean;
  moveRight: boolean;
}

function GameScene({ bots, onBotHit, isMobile, moveForward, moveBackward, moveLeft, moveRight }: GameSceneProps) {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!isMobile) return;

    const speed = 0.1;
    velocity.current.set(0, 0, 0);

    if (moveForward) velocity.current.z -= speed;
    if (moveBackward) velocity.current.z += speed;
    if (moveLeft) velocity.current.x -= speed;
    if (moveRight) velocity.current.x += speed;

    camera.position.add(velocity.current);
    camera.position.y = 1.6;
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

      {bots.map((bot) => (
        <BotEnemy key={bot.id} bot={bot} onHit={onBotHit} />
      ))}

      {!isMobile && <PointerLockControls />}
    </>
  );
}

interface Game3DProps {
  onExit: () => void;
}

export default function Game3D({ onExit }: Game3DProps) {
  const [kills, setKills] = useState(0);
  const [ammo, setAmmo] = useState(30);
  const [health, setHealth] = useState(100);
  const [isMobile, setIsMobile] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [hitmarker, setHitmarker] = useState(false);

  const [moveForward, setMoveForward] = useState(false);
  const [moveBackward, setMoveBackward] = useState(false);
  const [moveLeft, setMoveLeft] = useState(false);
  const [moveRight, setMoveRight] = useState(false);

  const shootSound = useRef<HTMLAudioElement | null>(null);
  const hitSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    shootSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApJn+DyvmwhBSuBzvLZiTYIG2m98OScTQwOU6rk8rNfGAU7k9nzzXksBSl7yPDajkULElyx6OyrUxMNTKXh8rZjHAU2j9Tv0ogxBylz0PDhlkAMFGS56+mjUBELQZnf8LxsIQUqfs7y3Ik2CBxpvfDlm0wMDlOo5PKwXhgFOpPY88t6LAUpfM3w2Y9FCxJcsejtrFMTDUyn4POxYhwFNY/U7tWHMgcrdc/w4ZVBDBVlu+vpo1ARC0GZ3/C6ayEFKn/O8t2INgcbab3w55xPDA5Tp+TysV4YBTmT2fPKfSwFKX/N8NiQRQwSXLHo7axTEw1Mp+DzsGIcBTOO1e7VhzUGLHjN8OGXRAwRZLrr6aJQEgpFm9/wvGwhBSt/zvLciT');
    hitSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApJn+DyvmwhBSuBzvLZiTYIG2m98OScTQwOU6rk8rNfGAU7k9nzzXksBSl7yPDajkULElyx6OyrUxMNTKXh8rZjHAU2j9Tv0ogxBylz0PDhlkAMFGS56+mjUBELQZnf8LxsIQUqfs7y3Ik2CBxpvfDlm0wMDlOo5PKwXhgFOpPY88t6LAUpfM3w2Y9FCxJcsejtrFMTDUyn4POxYhwFNY/U7tWHMgcrdc/w4ZVBDBVlu+vpo1ARC0GZ3/C6ayEFKn/O8t2INgcbab3w55xPDA5Tp+TysV4YBTmT2fPKfSwFKX/N8NiQRQwSXLHo7axTEw1Mp+DzsGIcBTOO1e7VhzUGLHjN8OGXRAwRZLrr6aJQEgpFm9/wvGwhBSt/zvLciT');

    const initialBots: Bot[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        0.9,
        (Math.random() - 0.5) * 30
      ),
      rotation: Math.random() * Math.PI * 2,
      health: 100,
      isDead: false,
      target: new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        0.9,
        (Math.random() - 0.5) * 30
      ),
    }));
    setBots(initialBots);

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleShoot = () => {
    if (ammo <= 0) return;

    setAmmo(ammo - 1);
    shootSound.current?.play().catch(() => {});

    const raycaster = new THREE.Raycaster();
    const camera = new THREE.Camera();
    
    const hit = Math.random() > 0.6;
    
    if (hit) {
      const aliveBots = bots.filter(b => !b.isDead);
      if (aliveBots.length > 0) {
        const targetBot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
        handleBotHit(targetBot.id);
      }
    }
  };

  const handleBotHit = (botId: number) => {
    hitSound.current?.play().catch(() => {});
    setHitmarker(true);
    setTimeout(() => setHitmarker(false), 200);

    setBots((prevBots) =>
      prevBots.map((bot) => {
        if (bot.id === botId && !bot.isDead) {
          const newHealth = bot.health - 34;
          if (newHealth <= 0) {
            setKills((k) => k + 1);
            return { ...bot, health: 0, isDead: true };
          }
          return { ...bot, health: newHealth };
        }
        return bot;
      })
    );
  };

  const reload = () => {
    setAmmo(30);
  };

  return (
    <div className="fixed inset-0 bg-background">
      <Canvas
        shadows
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        onClick={handleShoot}
      >
        <GameScene
          bots={bots}
          onBotHit={handleBotHit}
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
              <Icon name="Heart" className="text-destructive" />
              <span className="font-bold text-xl">{health}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Zap" className="text-primary" />
              <span className="font-bold text-xl">{ammo}/30</span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Target" className="text-secondary" />
              <span className="font-bold text-xl">{kills}</span>
            </div>
          </div>
          {ammo === 0 && (
            <Button onClick={reload} className="mt-2 w-full" size="sm">
              <Icon name="RotateCw" className="mr-1" size={16} />
              Reload
            </Button>
          )}
        </div>

        <Button
          onClick={onExit}
          variant="destructive"
          className="pointer-events-auto"
        >
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
            WASD - движение • ЛКМ - стрельба • R - перезарядка • Мышь - прицел • ESC - курсор
          </p>
        </div>
      )}
    </div>
  );
}
