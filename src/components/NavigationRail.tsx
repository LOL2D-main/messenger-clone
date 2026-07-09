import React, { useState, useRef } from 'react';
import { User, updateProfile, updatePassword, signOut } from 'firebase/auth';
import { MessageCircle, Users, ShoppingBag, Bell, Archive, Settings, LogOut, X, Camera, ChevronRight, Shield, User as UserIcon } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface NavigationRailProps {
  user: User;
  currentTab: 'chat' | 'people';
  setCurrentTab: (tab: 'chat' | 'people') => void;
}

export default function NavigationRail({ user, currentTab, setCurrentTab }: NavigationRailProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'info' | 'security' | 'main'>('main');
  const [avatarUrl, setAvatarUrl] = useState(user.photoURL || '/avatar.png');
  const [newName, setNewName] = useState(user.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    signOut(auth);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile(user, { photoURL: avatarUrl, displayName: newName });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: avatarUrl, name: newName });
      setStatusMessage('Đã cập nhật thông tin!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error("Error updating profile", error);
      setStatusMessage('Lỗi cập nhật thông tin.');
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setStatusMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    try {
      await updatePassword(user, newPassword);
      setStatusMessage('Đã cập nhật mật khẩu!');
      setNewPassword('');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error: any) {
      console.error("Error updating password", error);
      if (error.code === 'auth/requires-recent-login') {
         setStatusMessage('Vui lòng đăng nhập lại để đổi mật khẩu.');
      } else {
         setStatusMessage('Lỗi cập nhật mật khẩu: ' + error.message);
      }
    }
  };

  const renderSettingsContent = () => {
    if (activeSettingsTab === 'main') {
      return (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex flex-col items-center mb-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-[#e5e5e5] mb-2 relative group cursor-pointer" onClick={() => setActiveSettingsTab('info')}>
              <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <p className="text-[17px] font-bold text-[#050505]">{user.displayName || user.email}</p>
          </div>

          <button onClick={() => setActiveSettingsTab('info')} className="w-full flex items-center justify-between p-3 hover:bg-[#f0f2f5] rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e4e6e9] rounded-full text-[#050505]"><UserIcon className="w-5 h-5" /></div>
              <span className="font-semibold text-[15px] text-[#050505]">Thông tin cá nhân</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#65676b]" />
          </button>

          <button onClick={() => setActiveSettingsTab('security')} className="w-full flex items-center justify-between p-3 hover:bg-[#f0f2f5] rounded-xl transition">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e4e6e9] rounded-full text-[#050505]"><Shield className="w-5 h-5" /></div>
              <span className="font-semibold text-[15px] text-[#050505]">Mật khẩu và bảo mật</span>
            </div>
            <ChevronRight className="w-5 h-5 text-[#65676b]" />
          </button>
        </div>
      );
    }

    if (activeSettingsTab === 'info') {
      return (
        <div className="flex flex-col gap-4 mt-4">
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSettingsTab('main')}>
               <ChevronRight className="w-5 h-5 text-[#65676b] rotate-180" />
               <span className="font-semibold text-[15px]">Quay lại</span>
             </div>
           </div>
           
           <div className="flex flex-col items-center mb-4">
             <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
               <img src={avatarUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover border border-[#e5e5e5]" />
               <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                 <Camera className="w-6 h-6 text-white" />
               </div>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
             </div>
             <p className="text-[13px] text-[#65676b] mt-2 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>Tải ảnh lên</p>
           </div>

           <div>
             <label className="block text-[13px] font-semibold text-[#65676b] mb-1">Tên hiển thị</label>
             <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-3 bg-[#f0f2f5] rounded-xl text-[15px] focus:outline-none" />
           </div>

           {statusMessage && <p className="text-[13px] text-[#31a24c] text-center font-medium">{statusMessage}</p>}
           
           <button 
             onClick={handleUpdateProfile}
             className="w-full py-2.5 bg-[#0084ff] text-white font-bold text-[15px] rounded-lg hover:bg-[#0073e6] transition mt-2"
           >
             Lưu thay đổi
           </button>
        </div>
      );
    }

    if (activeSettingsTab === 'security') {
      return (
        <div className="flex flex-col gap-4 mt-4">
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSettingsTab('main')}>
               <ChevronRight className="w-5 h-5 text-[#65676b] rotate-180" />
               <span className="font-semibold text-[15px]">Quay lại</span>
             </div>
           </div>

           <div>
             <label className="block text-[13px] font-semibold text-[#65676b] mb-1">Mật khẩu mới</label>
             <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nhập mật khẩu mới" className="w-full p-3 bg-[#f0f2f5] rounded-xl text-[15px] focus:outline-none" />
             <p className="text-[12px] text-[#65676b] mt-2">
               Nếu bạn đăng nhập bằng Google, bạn có thể tạo mật khẩu mới để đăng nhập bằng Email/Mật khẩu.
             </p>
           </div>

           {statusMessage && <p className="text-[13px] text-[#0084ff] text-center font-medium">{statusMessage}</p>}

           <button 
             onClick={handleUpdatePassword}
             className="w-full py-2.5 bg-[#0084ff] text-white font-bold text-[15px] rounded-lg hover:bg-[#0073e6] transition mt-2"
           >
             Đổi mật khẩu
           </button>
        </div>
      );
    }
  };

  return (
    <div className="w-[80px] h-full flex flex-col items-center py-6 border-r border-[#e5e5e5] bg-white">
      {/* Logo */}
      <div className="mb-8 cursor-pointer">
        <img 
          src="/logo.png" 
          alt="Messenger Logo" 
          className="w-10 h-10 rounded-xl object-contain bg-white" 
        />
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-6 w-full items-center flex-1">
        <button 
          onClick={() => setCurrentTab('chat')}
          className={`p-3 rounded-xl relative group transition ${currentTab === 'chat' ? 'bg-[#e7f3ff] text-[#0084ff]' : 'text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505]'}`}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Đoạn chat</span>
        </button>
        <button 
          onClick={() => setCurrentTab('people')}
          className={`p-3 rounded-xl relative group transition ${currentTab === 'people' ? 'bg-[#e7f3ff] text-[#0084ff]' : 'text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505]'}`}
        >
          <Users className="w-6 h-6" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Mọi người</span>
        </button>
        <button className="p-3 text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505] rounded-xl transition relative group">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Cửa hàng</span>
        </button>
        <button className="p-3 text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505] rounded-xl transition relative group">
          <Archive className="w-6 h-6" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Kho lưu trữ</span>
        </button>
      </div>

      {/* Bottom Profile / Settings */}
      <div className="flex flex-col gap-4 items-center">
        <button onClick={() => { setShowSettings(true); setActiveSettingsTab('main'); }} className="p-3 text-[#65676b] hover:bg-[#f0f2f5] hover:text-[#050505] rounded-xl transition relative group">
          <Settings className="w-6 h-6" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Cài đặt</span>
        </button>
        <button onClick={handleLogout} className="p-3 text-[#65676b] hover:bg-[#f0f2f5] hover:text-red-500 rounded-xl transition relative group">
          <LogOut className="w-5 h-5" />
          <span className="absolute left-14 bg-[#050505] text-white text-[13px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition z-50">Đăng xuất</span>
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#e5e5e5]">
          <img src={user.photoURL || '/avatar.png'} alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-xl w-[400px] p-6 shadow-xl">
            <div className="flex justify-between items-center mb-2 border-b border-[#e5e5e5] pb-2">
              <h2 className="text-xl font-bold text-[#050505]">Cài đặt</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-[#f0f2f5] rounded-full transition text-[#65676b]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSettingsContent()}
          </div>
        </div>
      )}
    </div>
  );
}
