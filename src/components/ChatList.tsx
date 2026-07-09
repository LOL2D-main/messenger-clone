import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Plus, Video, Edit, X, Users as UsersIcon, MoreHorizontal, Trash2, MessageSquare, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  currentUser: User;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export default function ChatList({ currentUser, activeChatId, onSelectChat }: ChatListProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);

  const handleDeleteChat = async (chatId: string, e: any) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      if (activeChatId === chatId) {
        onSelectChat('');
      }
      setActiveMenuChatId(null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const qChats = query(
      collection(db, 'chats'),
      where('participantIds', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribeChats = onSnapshot(qChats, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatData);
    });

    const qNotes = query(
      collection(db, 'notes'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeNotes = onSnapshot(qNotes, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const now = new Date().getTime();
      const recentNotes = notesData.filter((note: any) => {
        if (!note.timestamp) return true;
        const noteTime = note.timestamp.toDate().getTime();
        return (now - noteTime) < 24 * 60 * 60 * 1000;
      });
      
      setNotes(recentNotes);
    });

    return () => {
      unsubscribeChats();
      unsubscribeNotes();
    };
  }, [currentUser.uid]);

  const fetchUsersForGroup = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => u.id !== currentUser.uid);
      setAvailableUsers(users);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  const handleOpenCreateGroup = () => {
    setShowCreateGroup(true);
    fetchUsersForGroup();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    
    setLoadingGroup(true);
    try {
      const participantIds = [currentUser.uid, ...selectedUsers];
      
      const participantsData: Record<string, any> = {
        [currentUser.uid]: { name: currentUser.displayName, photoURL: currentUser.photoURL || '/avatar.png' }
      };

      availableUsers.filter(u => selectedUsers.includes(u.id)).forEach(u => {
        participantsData[u.id] = { name: u.displayName, photoURL: u.photoURL || '/avatar.png' };
      });

      const newGroupRef = await addDoc(collection(db, 'chats'), {
        participantIds,
        participantsData,
        isGroup: true,
        name: groupName,
        photoURL: '/avatar.png',
        lastMessage: 'Nhóm đã được tạo',
        lastMessageTime: serverTimestamp()
      });

      onSelectChat(newGroupRef.id);
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      console.error("Error creating group", error);
    } finally {
      setLoadingGroup(false);
    }
  };

  const handlePostNote = async () => {
    if (!noteContent.trim()) return;
    try {
      await addDoc(collection(db, 'notes'), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        userPhotoURL: currentUser.photoURL || '/avatar.png',
        content: noteContent,
        timestamp: serverTimestamp()
      });
      setNoteContent('');
      setShowNoteModal(false);
    } catch (error) {
      console.error("Error posting note", error);
    }
  };

  const handleCreateAIBotChat = async () => {
    const q = query(collection(db, 'chats'), where('participantIds', '==', [currentUser.uid, 'tkv-ai']));
    const docs = await getDocs(q);
    if (!docs.empty) {
      onSelectChat(docs.docs[0].id);
      return;
    }

    const newChatRef = await addDoc(collection(db, 'chats'), {
      participantIds: [currentUser.uid, 'tkv-ai'],
      participantsData: {
        [currentUser.uid]: { name: currentUser.displayName, photoURL: currentUser.photoURL },
        'tkv-ai': { name: 'TKV AI', photoURL: '/logo.png' }
      },
      lastMessage: 'Xin chào! Mình là TKV AI.',
      lastMessageTime: serverTimestamp(),
      isGroup: false
    });
    
    await addDoc(collection(db, 'messages'), {
      chatId: newChatRef.id,
      senderId: 'tkv-ai',
      text: 'Xin chào! Mình là TKV AI. Nhắn tin cho mình để được hỗ trợ nhé.',
      timestamp: serverTimestamp(),
      isAI: true
    });

    onSelectChat(newChatRef.id);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="p-4 flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-[#050505] truncate">Đoạn chat</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button className="p-2 bg-[#f0f2f5] rounded-full text-[#050505] hover:bg-[#e4e6e9] flex-shrink-0">
            <Video className="w-5 h-5" />
          </button>
          <button onClick={handleCreateAIBotChat} className="p-2 bg-[#f0f2f5] rounded-full text-[#050505] hover:bg-[#e4e6e9] flex-shrink-0" title="Bắt đầu chat với AI">
            <Edit className="w-5 h-5" />
          </button>
          <button onClick={handleOpenCreateGroup} className="p-2 bg-[#f0f2f5] rounded-full text-[#050505] hover:bg-[#e4e6e9] flex-shrink-0" title="Tạo nhóm mới">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-[#65676b]" />
          <input 
            type="text" 
            placeholder="Tìm kiếm trên Messenger" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f0f2f5] rounded-full py-2 pl-10 pr-4 text-[15px] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto pb-2 mb-2 custom-scrollbar flex-shrink-0">
        <div className="flex flex-col items-center flex-shrink-0 cursor-pointer" onClick={() => setShowNoteModal(true)}>
          <div className="relative mt-6">
            {notes.find(n => n.userId === currentUser.uid) ? (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-[#e5e5e5] rounded-2xl px-3 py-1.5 shadow-sm max-w-[100px] truncate text-[12px] text-[#050505] z-10">
                {notes.find(n => n.userId === currentUser.uid)?.content}
              </div>
            ) : (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-[#e5e5e5] rounded-2xl px-2 py-1 shadow-sm text-[20px] text-[#050505] z-10 text-gray-400">
                 +
              </div>
            )}
            <div className="w-14 h-14 rounded-full p-0.5">
              <img src={currentUser.photoURL || '/avatar.png'} alt="Your story" className="w-full h-full rounded-full object-cover" />
            </div>
          </div>
          <span className="text-[12px] mt-1 text-[#65676b]">Ghi chú của bạn</span>
        </div>
        
        {/* Render friends from recent chats who have notes */}
        {Array.from(new Set(chats.filter(c => !c.isGroup).map(c => c.participantIds.find((id: string) => id !== currentUser.uid)))).map(friendId => {
          if (!friendId || friendId === 'tkv-ai') return null;
          const chat = chats.find(c => c.participantIds.includes(friendId));
          const friendData = chat?.participantsData?.[friendId];
          if (!friendData) return null;
          
          const friendNote = notes.find(n => n.userId === friendId);
          if (!friendNote) return null; // Only show friends with notes
          
          return (
            <div key={friendId as string} className="flex flex-col items-center flex-shrink-0 cursor-pointer">
              <div className="relative mt-6">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white border border-[#e5e5e5] rounded-2xl px-3 py-1.5 shadow-sm max-w-[100px] truncate text-[12px] text-[#050505] z-10">
                  {friendNote.content}
                </div>
                <div className="w-14 h-14 rounded-full p-0.5">
                  <img src={friendData.photoURL || '/avatar.png'} alt={friendData.name} className="w-full h-full rounded-full object-cover" />
                </div>
              </div>
              <span className="text-[12px] mt-1 text-[#050505] truncate w-14 text-center">{friendData.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
        {chats.map(chat => {
          const otherUserId = chat.participantIds.find((id: string) => id !== currentUser.uid);
          const otherUser = chat.participantsData?.[otherUserId] || { name: 'Người dùng ẩn danh', photoURL: '/avatar.png' };
          const name = chat.isGroup ? chat.name : otherUser.name;
          const photoURL = chat.isGroup ? chat.photoURL : otherUser.photoURL;
          
          return (
            <div 
              key={chat.id} 
              className="relative group"
              onMouseEnter={() => setHoveredChatId(chat.id)}
              onMouseLeave={() => setHoveredChatId(null)}
            >
              <button
                onClick={() => onSelectChat(chat.id)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition ${activeChatId === chat.id ? 'bg-[#e7f3ff]' : 'hover:bg-[#f2f2f2]'}`}
              >
                <div className="relative flex-shrink-0">
                  <img src={photoURL || '/avatar.png'} alt={name} className="w-14 h-14 rounded-full object-cover" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#31a24c] border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left overflow-hidden ml-3 pr-8">
                  <div className="flex justify-between items-baseline">
                    <h3 className={`font-semibold truncate text-[15px] ${activeChatId === chat.id ? 'text-[#050505]' : 'text-[#050505]'}`}>{name}</h3>
                    <span className={`text-[12px] flex-shrink-0 ml-2 ${activeChatId === chat.id ? 'text-[#0084ff]' : 'text-[#65676b]'}`}>
                      {chat.lastMessageTime?.toDate ? formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-[13px] truncate ${activeChatId === chat.id ? 'text-[#050505] font-semibold' : 'text-[#65676b]'}`}>
                      {chat.lastMessage || 'Bắt đầu trò chuyện'}
                    </p>
                    {activeChatId === chat.id && <div className="w-3 h-3 bg-[#0084ff] rounded-full flex-shrink-0 ml-2"></div>}
                  </div>
                </div>
              </button>

              {/* Three dots button */}
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 ${(hoveredChatId === chat.id || activeMenuChatId === chat.id) ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuChatId(activeMenuChatId === chat.id ? null : chat.id);
                  }} 
                  className="p-1.5 bg-white border border-[#e5e5e5] rounded-full shadow-sm text-[#050505] hover:bg-[#f0f2f5] transition"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Dropdown Menu */}
              {activeMenuChatId === chat.id && (
                <div className="absolute right-4 top-12 w-56 bg-white shadow-xl border border-[#e5e5e5] rounded-xl py-2 z-50">
                  <button onClick={(e) => handleDeleteChat(chat.id, e)} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-red-500">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[15px] font-medium">Xóa cuộc trò chuyện</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuChatId(null); }} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
                    <X className="w-4 h-4" />
                    <span className="text-[15px] font-medium text-[#050505]">Chặn</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuChatId(null); }} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[15px] font-medium text-[#050505]">Đánh dấu chưa đọc</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setActiveMenuChatId(null); }} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
                    <Info className="w-4 h-4" />
                    <span className="text-[15px] font-medium text-[#050505]">Báo cáo</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowCreateGroup(false)} className="p-2 hover:bg-[#f0f2f5] rounded-full text-[#65676b] transition">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-[17px] text-[#050505]">Tạo nhóm mới</h3>
            </div>
            <button 
              onClick={handleCreateGroup} 
              disabled={loadingGroup || !groupName.trim() || selectedUsers.length === 0}
              className="bg-[#0084ff] text-white px-4 py-1.5 rounded-lg font-medium text-[15px] hover:bg-[#0073e6] transition disabled:opacity-50"
            >
              {loadingGroup ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
          
          <div className="p-4 border-b border-[#e5e5e5]">
            <input 
              type="text" 
              placeholder="Tên nhóm..." 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-[#f0f2f5] rounded-lg py-3 px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0084ff]/20 font-semibold"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <h4 className="px-3 py-2 text-[13px] font-bold text-[#65676b] uppercase tracking-wider">Thêm thành viên</h4>
            {availableUsers.map(user => (
              <div 
                key={user.id} 
                onClick={() => toggleUserSelection(user.id)}
                className="flex items-center justify-between p-3 hover:bg-[#f0f2f5] rounded-lg transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || '/avatar.png'} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-[15px] text-[#050505]">{user.displayName}</p>
                    <p className="text-[13px] text-[#65676b]">ID: {user.customId}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedUsers.includes(user.id) ? 'border-[#0084ff] bg-[#0084ff]' : 'border-[#ccd0d5]'}`}>
                  {selectedUsers.includes(user.id) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Note Modal */}
      {showNoteModal && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNoteModal(false)} className="p-2 hover:bg-[#f0f2f5] rounded-full text-[#65676b] transition">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-[17px] text-[#050505]">Thêm ghi chú</h3>
            </div>
            <button 
              onClick={handlePostNote} 
              disabled={!noteContent.trim()}
              className="bg-[#0084ff] text-white px-4 py-1.5 rounded-lg font-medium text-[15px] hover:bg-[#0073e6] transition disabled:opacity-50"
            >
              Chia sẻ
            </button>
          </div>
          <div className="p-6 flex flex-col items-center">
            <div className="relative mb-6">
              <img src={currentUser.photoURL || '/avatar.png'} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" />
            </div>
            <input 
              type="text" 
              placeholder="Chia sẻ suy nghĩ của bạn..." 
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value.substring(0, 60))}
              className="w-full text-center bg-[#f0f2f5] rounded-xl py-4 px-4 text-[17px] focus:outline-none focus:ring-2 focus:ring-[#0084ff]/20 font-semibold"
              maxLength={60}
            />
            <p className="text-[13px] text-[#65676b] mt-3">Ghi chú sẽ tự động biến mất sau 24 giờ. Mọi người có thể thấy ghi chú của bạn.</p>
          </div>
        </div>
      )}
    </div>
  );
}
