import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, Search, User as UserIcon, ChevronDown, Image as ImageIcon, ArrowLeft } from 'lucide-react';

interface ChatDetailsProps {
  chatId: string;
  onClose?: () => void;
}

export default function ChatDetails({ chatId, onClose }: ChatDetailsProps) {
  const [chatDetails, setChatDetails] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'chats', chatId), (doc) => {
      setChatDetails(doc.data());
    });
    return () => unsub();
  }, [chatId]);

  if (!chatDetails) return <div className="p-4">Loading...</div>;

  // Assume the other participant is not the current user, or if it's AI
  const name = chatDetails.isGroup ? chatDetails.name : (Object.values(chatDetails.participantsData || {})[1] as any)?.name || 'TKV AI';
  const photoURL = chatDetails.isGroup ? chatDetails.photoURL : (Object.values(chatDetails.participantsData || {})[1] as any)?.photoURL || 'https://ui-avatars.com/api/?name=TKV+AI&background=0D8ABC&color=fff';

  return (
    <div className="flex flex-col h-full bg-white pt-6 relative">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 left-4 p-2 text-[#050505] hover:bg-[#f0f2f5] rounded-full transition z-10">
          <ArrowLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex flex-col items-center pb-6">
        <img src={photoURL || 'https://storage.googleapis.com/aistudio-v0-artifacts/d0e7c35b-4634-472f-88b3-9e6b8a43a08d/2.jpg'} alt={name} className="w-24 h-24 rounded-full mb-3 object-cover" />
        <h2 className="text-[17px] font-bold text-[#050505]">{name}</h2>
        <p className="text-[13px] text-[#65676b] mb-6">Hoạt động 5 phút trước</p>
        
        <div className="w-full px-4 flex justify-center gap-6">
          <div className="flex flex-col items-center gap-1 cursor-pointer group w-16">
            <div className="w-10 h-10 bg-[#f0f2f5] rounded-full flex items-center justify-center group-hover:bg-[#e4e6e9] transition">
              <UserIcon className="w-5 h-5 text-[#050505]" />
            </div>
            <span className="text-[12px] font-medium text-[#050505] text-center">Trang cá nhân</span>
          </div>
          
          <div className="flex flex-col items-center gap-1 cursor-pointer group w-16">
            <div className="w-10 h-10 bg-[#f0f2f5] rounded-full flex items-center justify-center group-hover:bg-[#e4e6e9] transition">
              <Bell className="w-5 h-5 text-[#050505]" />
            </div>
            <span className="text-[12px] font-medium text-[#050505] text-center">Tắt thông báo</span>
          </div>
          
          <div className="flex flex-col items-center gap-1 cursor-pointer group w-16">
            <div className="w-10 h-10 bg-[#f0f2f5] rounded-full flex items-center justify-center group-hover:bg-[#e4e6e9] transition">
              <Search className="w-5 h-5 text-[#050505]" />
            </div>
            <span className="text-[12px] font-medium text-[#050505] text-center">Tìm kiếm</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="pt-4 border-t border-[#e5e5e5] w-full px-4 space-y-2">
          <div className="flex justify-between items-center py-2 cursor-pointer hover:bg-[#f0f2f5] px-2 rounded">
            <span className="text-[14px] font-medium text-[#050505]">Thông tin về đoạn chat</span>
            <ChevronDown className="w-4 h-4 text-[#65676b]" />
          </div>
          <div className="flex justify-between items-center py-2 cursor-pointer hover:bg-[#f0f2f5] px-2 rounded">
            <span className="text-[14px] font-medium text-[#050505]">File phương tiện, file và liên kết</span>
            <ChevronDown className="w-4 h-4 text-[#65676b]" />
          </div>
        </div>
      </div>
    </div>
  );
}
