import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Copy, UserPlus, MessageCircle } from 'lucide-react';

interface PeopleViewProps {
  currentUser: User;
  onStartChat: (chatId: string) => void;
}

export default function PeopleView({ currentUser, onStartChat }: PeopleViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [myCustomId, setMyCustomId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMyProfile = async () => {
      const q = query(collection(db, 'users'), where('uid', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setMyCustomId(snapshot.docs[0].data().customId || '');
      }
    };
    fetchMyProfile();
  }, [currentUser]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => 
          u.id !== currentUser.uid && 
          (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           u.customId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép ID vào khay nhớ tạm!');
  };

  const startChatWithUser = async (otherUser: any) => {
    // Check if chat already exists
    const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', currentUser.uid));
    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs.find(doc => {
      const data = doc.data();
      return !data.isGroup && data.participantIds.includes(otherUser.uid);
    });

    if (existingChat) {
      onStartChat(existingChat.id);
      return;
    }

    // Create new chat
    const newChatRef = await addDoc(collection(db, 'chats'), {
      participantIds: [currentUser.uid, otherUser.uid],
      participantsData: {
        [currentUser.uid]: { name: currentUser.displayName, photoURL: currentUser.photoURL || '/avatar.png' },
        [otherUser.uid]: { name: otherUser.displayName, photoURL: otherUser.photoURL || '/avatar.png' }
      },
      lastMessage: '',
      lastMessageTime: serverTimestamp(),
      isGroup: false
    });

    onStartChat(newChatRef.id);
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="h-[60px] px-6 flex items-center border-b border-[#e5e5e5] shadow-sm">
        <h2 className="text-xl font-bold text-[#050505]">Mọi người</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full custom-scrollbar">
        {/* Profile Card */}
        <div className="bg-[#f0f2f5] rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={currentUser.photoURL || '/avatar.png'} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
            <div>
              <h3 className="font-bold text-[17px] text-[#050505]">{currentUser.displayName}</h3>
              <div className="text-[14px] text-[#65676b] flex items-center gap-1 relative group cursor-pointer" onClick={() => copyToClipboard(myCustomId)}>
                <span>ID của bạn:</span>
                <span className="font-semibold text-[#0084ff]">{myCustomId}</span>
                <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-xl border border-[#e5e5e5] rounded-xl px-3 py-2 flex items-center gap-2 z-10 pointer-events-none">
                  <Copy className="w-4 h-4 text-[#65676b]" />
                  <div className="flex flex-col text-[13px] font-medium text-[#050505] leading-tight">
                    <span>Sao</span>
                    <span>chép</span>
                    <span>ID</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="mb-6">
          <h3 className="font-bold text-[17px] text-[#050505] mb-4">Tìm kiếm bạn bè</h3>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#65676b]" />
              <input 
                type="text"
                placeholder="Nhập Tên, ID hoặc Email để tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-[#f0f2f5] rounded-xl pl-12 pr-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0084ff]/20"
              />
            </div>
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="bg-[#0084ff] text-white px-6 py-3 rounded-xl font-bold text-[15px] hover:bg-[#0073e6] transition disabled:opacity-50"
            >
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>

        {/* Results */}
        {searchResults.length > 0 && (
          <div>
            <h4 className="font-bold text-[15px] text-[#65676b] mb-4 uppercase tracking-wider">Kết quả tìm kiếm ({searchResults.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map(user => (
                <div key={user.uid} className="border border-[#e5e5e5] rounded-xl p-4 flex items-center justify-between hover:shadow-md transition bg-white">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || '/avatar.png'} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-[15px] text-[#050505]">{user.displayName}</p>
                      <p className="text-[13px] text-[#65676b]">ID: {user.customId || 'Chưa có'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => startChatWithUser(user)}
                    className="flex items-center gap-2 bg-[#e7f3ff] text-[#0084ff] px-4 py-2 rounded-lg font-medium text-[14px] hover:bg-[#dbeafe] transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Nhắn tin
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {searchResults.length === 0 && searchQuery && !loading && (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-[#bcc0c4] mx-auto mb-4" />
            <h3 className="text-[17px] font-bold text-[#050505]">Không tìm thấy kết quả</h3>
            <p className="text-[15px] text-[#65676b]">Thử tìm kiếm bằng ID chính xác hoặc tên khác.</p>
          </div>
        )}
      </div>
    </div>
  );
}
