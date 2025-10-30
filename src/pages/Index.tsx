import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import Game3D from '@/components/Game3D';

interface User {
  id: number;
  username: string;
  balance: number;
}

type Screen = 'auth' | 'menu' | 'profile' | 'game' | 'game-bots';

export default function Index() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('cs2_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setScreen('menu');
    }
  }, []);

  const handleAuth = async () => {
    if (!username || !password) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/9aeb3eda-3f84-4456-be65-360728326b8b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'register',
          username,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('cs2_user', JSON.stringify(data.user));
        setScreen('menu');
        toast({
          title: isLogin ? 'Успешный вход!' : 'Регистрация завершена!',
          description: `Добро пожаловать, ${data.user.username}`,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Что-то пошло не так',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка соединения',
        description: 'Проверьте интернет-подключение',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cs2_user');
    setScreen('auth');
    setUsername('');
    setPassword('');
  };

  if (screen === 'auth') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-card border-2 border-border animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-primary mb-2">CS2 MOBILE</h1>
            <p className="text-muted-foreground text-lg">Tactical Shooter</p>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Никнейм"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 text-lg bg-muted border-border"
            />
            <Input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-lg bg-muted border-border"
            />
            
            <Button
              onClick={handleAuth}
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLogin ? 'ВОЙТИ' : 'РЕГИСТРАЦИЯ'}
            </Button>

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (screen === 'game' || screen === 'game-bots') {
    return <Game3D onExit={() => setScreen('menu')} />;
  }

  if (screen === 'profile' && user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <Button
            onClick={() => setScreen('menu')}
            variant="ghost"
            className="mb-4"
          >
            <Icon name="ArrowLeft" className="mr-2" />
            Назад
          </Button>

          <Card className="p-8 bg-card border-2 border-border">
            <div className="text-center mb-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="User" size={48} className="text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">{user.username}</h2>
              <p className="text-muted-foreground">ID: {user.id}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-muted rounded">
                <span className="text-lg">Баланс:</span>
                <span className="text-2xl font-bold text-primary">${user.balance}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded text-center">
                  <Icon name="Trophy" className="mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Побед</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="p-4 bg-muted rounded text-center">
                  <Icon name="Target" className="mx-auto mb-2 text-secondary" />
                  <p className="text-sm text-muted-foreground">K/D</p>
                  <p className="text-2xl font-bold">0.0</p>
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full h-12"
              >
                <Icon name="LogOut" className="mr-2" />
                Выйти из аккаунта
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-6xl font-bold text-primary mb-2 animate-pulse-glow">CS2 MOBILE</h1>
          <p className="text-muted-foreground text-xl">Tactical Shooter</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card
            onClick={() => setScreen('game')}
            className="p-6 bg-card border-2 border-primary hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name="Users" size={32} className="text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">МУЛЬТИПЛЕЕР</h3>
                <p className="text-muted-foreground">Играть с друзьями</p>
              </div>
            </div>
          </Card>

          <Card
            onClick={() => setScreen('game-bots')}
            className="p-6 bg-card border-2 border-secondary hover:border-secondary/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded bg-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name="Bot" size={32} className="text-secondary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">ИГРАТЬ С БОТАМИ</h3>
                <p className="text-muted-foreground">Практика и тренировки</p>
              </div>
            </div>
          </Card>

          <Card
            onClick={() => setScreen('profile')}
            className="p-6 bg-card border-2 border-accent hover:border-accent/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name="User" size={32} className="text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">ПРОФИЛЬ</h3>
                <p className="text-muted-foreground">{user?.username}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-2 border-muted hover:border-muted-foreground/50 transition-all cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name="UserPlus" size={32} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">ДРУЗЬЯ</h3>
                <p className="text-muted-foreground">Добавить по ID</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 bg-card/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon name="Gamepad2" className="text-primary" />
              <span className="text-sm text-muted-foreground">
                Управление: WASD • Стрельба: ЛКМ • Прицел: ПКМ
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}