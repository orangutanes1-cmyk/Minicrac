import { useStore, BlockType, ActiveTool } from './store';
import { Crosshair, Box, Pickaxe, Eye, ArrowUp, User, Menu, Bug, Hand, Sword, Skull, Target, Users, Grid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Joystick } from './Joystick';
import { AvatarEditor } from './AvatarEditor';

const blocks: BlockType[] = ['dirt', 'grass', 'stone', 'wood', 'leaves', 'glass', 'bed'];

export const UI = () => {
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);
  const activeBlockType = useStore((state) => state.activeBlockType);
  const setActiveBlockType = useStore((state) => state.setActiveBlockType);
  const isThirdPerson = useStore((state) => state.isThirdPerson);
  const toggleThirdPerson = useStore((state) => state.toggleThirdPerson);
  const setThirdPerson = useStore((state) => state.setThirdPerson);
  
  const setJoystickMove = useStore((state) => state.setJoystickMove);
  const setActionJump = useStore((state) => state.setActionJump);
  const setActionPlace = useStore((state) => state.setActionPlace);
  const setActionBreak = useStore((state) => state.setActionBreak);
  const setActionSpawnMob = useStore((state) => state.setActionSpawnMob);
  const setActionSpawnZombie = useStore((state) => state.setActionSpawnZombie);
  const setActionSpawnHuman = useStore((state) => state.setActionSpawnHuman);

  const isEditingAvatar = useStore((state) => state.isEditingAvatar);
  const setIsEditingAvatar = useStore((state) => state.setIsEditingAvatar);

  const isMenuOpen = useStore((state) => state.isMenuOpen);
  const setIsMenuOpen = useStore((state) => state.setIsMenuOpen);
  const sandboxMode = useStore((state) => state.sandboxMode);
  const setSandboxMode = useStore((state) => state.setSandboxMode);
  const health = useStore((state) => state.health);
  const isDead = useStore((state) => state.isDead);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToggleEditor = () => {
    const newEditingState = !isEditingAvatar;
    setIsEditingAvatar(newEditingState);
    if (newEditingState) {
      setThirdPerson(true);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  };

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen && document.pointerLockElement) {
      document.exitPointerLock();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
      {/* Crosshair */}
      {!isEditingAvatar && !isMenuOpen && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Crosshair className="text-white/50 w-6 h-6" />
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between p-4 pointer-events-auto gap-2">
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleToggleMenu}
            className={`p-2 rounded-lg text-white transition-colors ${isMenuOpen ? 'bg-blue-600' : 'bg-black/50 hover:bg-black/70'}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Health Bar */}
          <div className="bg-black/50 p-2 rounded-lg flex items-center gap-2">
            <div className="w-32 h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-300" 
                style={{ width: `${health}%` }}
              />
            </div>
            <span className="text-white text-xs font-bold">{Math.round(health)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleToggleEditor}
            className={`p-2 rounded-lg text-white transition-colors ${isEditingAvatar ? 'bg-blue-600' : 'bg-black/50 hover:bg-black/70'}`}
          >
            <User className="w-6 h-6" />
          </button>
          <button 
            onClick={toggleThirdPerson}
            className="bg-black/50 p-2 rounded-lg text-white hover:bg-black/70 transition-colors"
          >
            <Eye className={isThirdPerson ? 'text-green-400' : 'text-white'} />
          </button>
        </div>
      </div>

      {/* Menu Overlay */}
      {isMenuOpen && !isDead && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-zinc-900 p-8 rounded-2xl max-w-sm w-full border border-zinc-800">
            <h2 className="text-2xl font-bold text-white mb-6">Menu</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSandboxMode(!sandboxMode);
                  if (sandboxMode && activeBlockType === 'hand') {
                    setActiveBlockType('wood'); // Reset to wood if leaving sandbox mode
                  }
                }}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-between ${
                  sandboxMode ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span>Sandbox Mode</span>
                <span className="text-sm">{sandboxMode ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={handleToggleMenu}
                className="w-full py-3 px-4 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Menu Modal */}
      {isBlockMenuOpen && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-zinc-900 p-6 rounded-2xl max-w-lg w-full">
            <h2 className="text-white text-xl font-bold mb-4">Select Item</h2>
            <div className="grid grid-cols-4 gap-4">
              <button
                onClick={() => { setActiveBlockType('hand'); setIsBlockMenuOpen(false); }}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${activeBlockType === 'hand' ? 'border-white bg-white/10' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                <Hand className="text-white w-8 h-8" />
                <span className="text-white text-xs">Hand</span>
              </button>
              <button
                onClick={() => { setActiveBlockType('sword'); setIsBlockMenuOpen(false); }}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${activeBlockType === 'sword' ? 'border-white bg-white/10' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                <Sword className="text-white w-8 h-8" />
                <span className="text-white text-xs">Sword</span>
              </button>
              <button
                onClick={() => { setActiveBlockType('shotgun'); setIsBlockMenuOpen(false); }}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${activeBlockType === 'shotgun' ? 'border-white bg-white/10' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                <Target className="text-white w-8 h-8" />
                <span className="text-white text-xs">Shotgun</span>
              </button>
              {blocks.map((type) => (
                <button
                  key={type}
                  onClick={() => { setActiveBlockType(type); setIsBlockMenuOpen(false); }}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${activeBlockType === type ? 'border-white bg-white/10' : 'border-zinc-700 hover:border-zinc-500'}`}
                >
                  <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
                    <span className="text-xs text-white capitalize">{type.substring(0, 3)}</span>
                  </div>
                  <span className="text-white text-xs capitalize">{type}</span>
                </button>
              ))}
            </div>
            <button 
              onClick={() => setIsBlockMenuOpen(false)}
              className="mt-6 w-full py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Area */}
      <div className="p-4 flex flex-col gap-4">
        {/* Inventory & Sandbox Tools */}
        <div className={`flex gap-2 pointer-events-auto flex-wrap ${sandboxMode ? 'justify-center' : 'justify-end'}`}>
          {sandboxMode ? (
            <>
              {/* Sandbox Mode: Show current block and open menu button */}
              <button
                onClick={() => setIsBlockMenuOpen(true)}
                className="w-16 h-16 rounded-xl border-2 border-white flex flex-col items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
                title="Select Item"
              >
                {activeBlockType === 'hand' ? (
                  <Hand className="text-white w-6 h-6 mb-1" />
                ) : activeBlockType === 'sword' ? (
                  <Sword className="text-white w-6 h-6 mb-1" />
                ) : activeBlockType === 'shotgun' ? (
                  <Target className="text-white w-6 h-6 mb-1" />
                ) : (
                  <Grid className="text-white w-6 h-6 mb-1" />
                )}
                <span className="text-[10px] text-white font-bold capitalize">{activeBlockType}</span>
              </button>
              
              <div className="w-px h-16 bg-white/20 mx-2" />
              
              {/* Spawn Mob */}
              <button
                onClick={() => setActionSpawnMob(true)}
                className="w-16 h-16 rounded-xl border-2 border-red-500 flex flex-col items-center justify-center bg-red-900/50 hover:bg-red-900/80 transition-colors"
                title="Spawn Fleshy Mob"
              >
                <Bug className="text-red-400 w-6 h-6 mb-1" />
                <span className="text-[10px] text-red-400 font-bold">Rope</span>
              </button>
              
              {/* Spawn Zombie */}
              <button
                onClick={() => setActionSpawnZombie(true)}
                className="w-16 h-16 rounded-xl border-2 border-green-500 flex flex-col items-center justify-center bg-green-900/50 hover:bg-green-900/80 transition-colors"
                title="Spawn Zombie"
              >
                <Skull className="text-green-400 w-6 h-6 mb-1" />
                <span className="text-[10px] text-green-400 font-bold">Zombie</span>
              </button>

              {/* Spawn Human */}
              <button
                onClick={() => setActionSpawnHuman(true)}
                className="w-16 h-16 rounded-xl border-2 border-blue-500 flex flex-col items-center justify-center bg-blue-900/50 hover:bg-blue-900/80 transition-colors"
                title="Spawn Human"
              >
                <Users className="text-blue-400 w-6 h-6 mb-1" />
                <span className="text-[10px] text-blue-400 font-bold">Human</span>
              </button>
            </>
          ) : (
            /* Normal Mode: Only show equipped block */
            <div className="w-16 h-16 rounded-xl border-2 border-white flex items-center justify-center bg-black/50">
              {activeBlockType === 'hand' ? (
                <Hand className="text-white w-8 h-8" />
              ) : activeBlockType === 'sword' ? (
                <Sword className="text-white w-8 h-8" />
              ) : activeBlockType === 'shotgun' ? (
                <Target className="text-white w-8 h-8" />
              ) : (
                <span className="text-sm font-bold text-white capitalize">{activeBlockType}</span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        {isMobile && !isEditingAvatar && !isMenuOpen && (
          <div className="flex justify-between items-end h-40">
            {/* Left Joystick (Move) */}
            <div className="pointer-events-auto joystick">
              <Joystick onChange={setJoystickMove} />
            </div>

            {/* Right Actions */}
            <div className="flex flex-col gap-4 pointer-events-auto">
              <div className="flex gap-4">
                <button 
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                  onTouchStart={() => setActionBreak(true)}
                >
                  <Pickaxe className="text-white" />
                </button>
                <button 
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                  onTouchStart={() => setActionPlace(true)}
                >
                  <Box className="text-white" />
                </button>
              </div>
              <div className="flex justify-end">
                <button 
                  className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                  onTouchStart={() => setActionJump(true)}
                >
                  <ArrowUp className="text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AvatarEditor />
    </div>
  );
};
