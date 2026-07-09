import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Phone, Video, Info, Plus, Image as ImageIcon, Smile, Mic, ThumbsUp, Send, X, FileAudio, FileImage, FileVideo, MoreHorizontal, MessageSquare, BarChart2, Reply, Share, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';

const AudioPlayer = ({ src, isMe }: { src: string, isMe: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatAudioTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-2 min-w-[150px]`}>
      <button onClick={togglePlay} className={`p-2 rounded-full ${isMe ? 'bg-white text-[#0084ff]' : 'bg-[#f0f2f5] text-[#050505] border border-[#e5e5e5]'} transition`}>
        {isPlaying ? (
           <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
           <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="flex-1 flex items-center gap-0.5 h-6 mx-2 opacity-80">
        {[...Array(20)].map((_, i) => (
           <div key={i} className={`w-0.5 rounded-full ${isMe ? 'bg-white' : 'bg-[#0084ff]'}`} style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
        ))}
      </div>
      <span className="text-[12px] font-medium">{formatAudioTime(duration || currentTime)}</span>
      <audio ref={audioRef} src={src} className="hidden" preload="metadata" />



    </div>
  );
};

interface ChatWindowProps {
  currentUser: User;
  chatId: string;
  onBack?: () => void;
  showChatDetails?: boolean;
  setShowChatDetails?: (show: boolean) => void;
  onStartCall?: (chatId: string, calleeId: string, isVideoCall: boolean) => void;
}

export default function ChatWindow({ currentUser, chatId, onBack, showChatDetails, setShowChatDetails, onStartCall }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState('');
  
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Fetch Chat Details
    const unsubChat = onSnapshot(doc(db, 'chats', chatId), (doc) => {
      setChatDetails({ id: doc.id, ...doc.data() });
    });

    // Fetch Messages
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      unsubChat();
      unsubMessages();
    };
  }, [chatId]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    
    // Check for mention: word starting with @ at the end of the input
    const match = val.match(/(?:^|\s)@([^ ]*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
    } else {
      setMentionSearch(null);
    }
  };

  const handleMentionSelect = (name: string) => {
    const val = newMessage;
    const match = val.match(/(?:^|\s)@([^ ]*)$/);
    if (match) {
      const newVal = val.substring(0, match.index! + (val[match.index!] === ' ' ? 1 : 0)) + '@' + name + ' ';
      setNewMessage(newVal);
      setMentionSearch(null);
    }
  };

  const getMentionUsers = () => {
    if (!chatDetails) return [];
    const users = [];
    if (chatDetails.isGroup) {
      users.push({ id: 'all', name: 'Báo cho cả nhóm', sub: '@All', icon: '@' });
    }
    Object.entries(chatDetails.participantsData || {}).forEach(([id, data]: [string, any]) => {
      if (id !== currentUser.uid && id !== 'tkv-ai') {
        users.push({ id, name: data.name, photoURL: data.photoURL });
      }
    });
    users.push({ id: 'tkv-ai', name: 'TKV AI', photoURL: '/logo.png', sub: '@TKV AI' });
    
    return mentionSearch !== null 
      ? users.filter(u => u.name.toLowerCase().includes(mentionSearch) || u.sub?.toLowerCase().includes(mentionSearch))
      : [];
  };

  const startRecording = async () => {
    try {
      setShowPlusMenu(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorder.mimeType || 'audio/mp4';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          uploadAudio(audioBlob, mimeType);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing mic:", err);
      // Use a custom error message or set state
      setNewMessage("Lỗi: Không thể truy cập micro (" + err.message + ")");
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        audioChunksRef.current = []; // Clear chunks to prevent upload
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadAudio = async (blob: Blob, mimeType: string = 'audio/webm') => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        try {
          await addDoc(collection(db, 'messages'), {
            chatId,
            senderId: currentUser.uid,
            text: 'Đã gửi một tin nhắn thoại',
            fileUrl: base64data,
            fileType: 'audio',
            timestamp: serverTimestamp(),
          });

          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: 'Đã gửi một tin nhắn thoại',
            lastMessageTime: serverTimestamp()
          });
        } catch (e: any) {
          console.error("Firestore error", e);
          setNewMessage('Lỗi gửi tin nhắn: ' + e.message);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setNewMessage('Lỗi: Không thể xử lý file âm thanh.');
        setIsUploading(false);
      };
    } catch (error) {
      console.error("Error uploading audio", error);
      setIsUploading(false);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    
    const options = pollOptions.filter(o => o.trim()).map(text => ({ text, votes: [] }));
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      senderId: currentUser.uid,
      text: 'Đã tạo một bình chọn',
      type: 'poll',
      pollData: {
        question: pollQuestion,
        options
      },
      timestamp: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: 'Đã tạo một bình chọn',
      lastMessageTime: serverTimestamp()
    });
    
    setShowPollModal(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleVotePoll = async (messageId: string, optionIndex: number, currentPollData: any) => {
    const newOptions = [...currentPollData.options];
    const option = newOptions[optionIndex];
    const uid = currentUser.uid;
    
    // Remove user's vote from all other options
    newOptions.forEach(opt => {
      const idx = opt.votes.indexOf(uid);
      if (idx > -1) opt.votes.splice(idx, 1);
    });
    
    // Add vote to this option
    option.votes.push(uid);
    
    await updateDoc(doc(db, 'messages', messageId), {
      'pollData.options': newOptions
    });
  };

const handleSendMessage = async (e?: React.FormEvent, isLike: boolean = false) => {
    e?.preventDefault();
    if (!newMessage.trim() && !isLike && !editingMessageId) return;

    if (editingMessageId) {
      await updateDoc(doc(db, 'messages', editingMessageId), {
        text: newMessage,
        isEdited: true
      });
      setNewMessage('');
      setEditingMessageId(null);
      return;
    }

    const messageText = isLike ? '👍' : newMessage;
    if (!isLike) setNewMessage('');

    // Save user message
    await addDoc(collection(db, 'messages'), {
      chatId,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
    });

    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: messageText,
      lastMessageTime: serverTimestamp()
    });

    // Check if AI is mentioned or if it's a direct AI chat
    const isDirectAI = chatDetails?.participantIds.includes('tkv-ai') && chatDetails?.participantIds.length === 2;
    const isMentioned = messageText.toLowerCase().includes('@tkv ai');

    if ((isDirectAI || isMentioned) && !isLike) {
      setIsTypingAI(true);
      try {
        // Format history for Gemini API
        const history = messages.slice(-10).map(m => ({
          role: m.senderId === 'tkv-ai' ? 'model' : 'user',
          parts: [{ text: m.text || '[File đính kèm]' }]
        }));

        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: messageText, history })
        });

        const data = await response.json();

        if (data.text) {
          await addDoc(collection(db, 'messages'), {
            chatId,
            senderId: 'tkv-ai',
            text: data.text,
            timestamp: serverTimestamp(),
            isAI: true
          });

          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: data.text,
            lastMessageTime: serverTimestamp()
          });
        }
      } catch (err) {
        console.error('Failed to get AI response', err);
      } finally {
        setIsTypingAI(false);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max size 1MB for base64 storage limits
    if (file.size > 1024 * 1024) {
      setNewMessage('Lỗi: File quá lớn. Vui lòng chọn file dưới 1MB.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        const isVideo = file.type.startsWith('video/');
        
        try {
          await addDoc(collection(db, 'messages'), {
            chatId,
            senderId: currentUser.uid,
            text: isVideo ? 'Đã gửi một video' : 'Đã gửi một ảnh',
            fileUrl: base64data,
            fileType: isVideo ? 'video' : 'image',
            timestamp: serverTimestamp(),
          });

          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: isVideo ? 'Đã gửi một video' : 'Đã gửi một ảnh',
            lastMessageTime: serverTimestamp()
          });
        } catch (e: any) {
          console.error("Firestore error", e);
          setNewMessage('Lỗi gửi file: ' + e.message);
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setNewMessage('Lỗi: Không thể xử lý file.');
        setIsUploading(false);
      };
    } catch (error) {
      console.error("Error uploading", error);
      setIsUploading(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const msgRef = doc(db, 'messages', messageId);
    const msgDoc = await getDoc(msgRef);
    if (msgDoc.exists()) {
      const reactions = msgDoc.data().reactions || {};
      if (reactions[currentUser.uid] === emoji) {
        delete reactions[currentUser.uid];
      } else {
        reactions[currentUser.uid] = emoji;
      }
      await updateDoc(msgRef, { reactions });
    }
    setActiveReactionMessageId(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (e) {
      console.error(e);
    }
    setActiveMessageMenuId(null);
  };

  const handleDeleteChat = async () => {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
    } catch (e) {
      console.error(e);
    }
  };

  if (!chatDetails || !chatDetails.participantIds) return <div className="flex-1 flex items-center justify-center">Loading...</div>;

  const otherUserId = chatDetails.participantIds.find((id: string) => id !== currentUser.uid) || currentUser.uid;
  const otherUser = chatDetails.participantsData?.[otherUserId] || { name: 'Unknown User', photoURL: '' };
  const name = chatDetails.isGroup ? chatDetails.name : otherUser.name;
  const photoURL = chatDetails.isGroup ? chatDetails.photoURL : otherUser.photoURL;

  const handleInitCall = (isVideo: boolean) => {
    if (chatDetails.isGroup) {
      setAlertMsg('Không hỗ trợ gọi nhóm trong phiên bản này.');
      setTimeout(() => setAlertMsg(''), 3000);
      return;
    }
    if (otherUserId) {
      if (otherUserId === 'tkv-ai') {
        setAlertMsg('Không thể gọi cho AI');
        setTimeout(() => setAlertMsg(''), 3000);
        return;
      }
      onStartCall?.(chatId, otherUserId, isVideo);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {alertMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-4">
          {alertMsg}
        </div>
      )}

      {/* Header */}
      <div className="h-[60px] px-4 flex flex-shrink-0 items-center justify-between border-b border-[#e5e5e5] bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[#0084ff] hover:bg-[#f0f2f5] rounded-full transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="relative">
            <img src={photoURL || '/avatar.png'} alt={name} className="w-10 h-10 rounded-full object-cover bg-white" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#31a24c] border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h2 className="font-bold text-[15px] leading-tight text-[#050505]">{name}</h2>
            <p className="text-[12px] text-[#65676b]">Đang hoạt động</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#0084ff] relative">
          <button onClick={() => handleInitCall(false)} className="hover:bg-[#f0f2f5] p-2 rounded-full transition"><Phone className="w-5 h-5" /></button>
          <button onClick={() => handleInitCall(true)} className="hover:bg-[#f0f2f5] p-2 rounded-full transition"><Video className="w-6 h-6" /></button>
          <button onClick={() => setShowChatDetails?.(!showChatDetails)} className="hover:bg-[#f0f2f5] p-2 rounded-full transition"><Info className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 custom-scrollbar">
        {/* Intro */}
        <div className="flex flex-col items-center justify-center pt-8 pb-12">
          <img src={photoURL || '/avatar.png'} alt={name} className="w-24 h-24 rounded-full mb-4 object-cover bg-white" />
          <h2 className="text-xl font-bold text-[#050505]">{name}</h2>
          <p className="text-[13px] text-[#65676b]">Các bạn là bạn bè trên Messenger</p>
        </div>

        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.uid;
          const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId);
          const hasReaction = msg.reactions && Object.keys(msg.reactions).length > 0;
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1 group relative`} onMouseLeave={() => setActiveReactionMessageId(null)}>
              <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${hasReaction ? 'mb-4' : ''}`}>
                {!isMe && (
                  <div className="w-7 h-7 flex-shrink-0">
                    {showAvatar && (
                      <img src={msg.senderId === 'tkv-ai' ? '/logo.png' : (otherUser.photoURL || '/avatar.png')} alt="Avatar" className="w-7 h-7 rounded-full object-cover bg-white" />
                    )}
                  </div>
                )}
                
                <div className="relative group/msg flex items-center">
                  {!isMe && activeReactionMessageId === msg.id && (
                    <div className="absolute -top-10 left-0 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-20 border border-[#e5e5e5]">
                      {['❤️', '😆', '😮', '😢', '😡', '👍'].map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition transform text-xl">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  {isMe && activeReactionMessageId === msg.id && (
                    <div className="absolute -top-10 right-0 bg-white shadow-lg rounded-full px-2 py-1 flex gap-1 z-20 border border-[#e5e5e5]">
                      {['❤️', '😆', '😮', '😢', '😡', '👍'].map(emoji => (
                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="hover:scale-125 transition transform text-xl">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {isMe && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition mr-2 relative flex-shrink-0">
                       <button onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id)} className="p-1.5 text-[#65676b] hover:bg-[#f0f2f5] rounded-full"><MoreHorizontal className="w-4 h-4" /></button>
                       {activeMessageMenuId === msg.id && (
                         <div className="absolute top-10 right-0 bg-white shadow-xl border border-[#e5e5e5] rounded-xl py-2 w-48 z-30">
                           <button className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-[#050505]">
                             <Reply className="w-4 h-4" /> Trả lời
                           </button>
                           <button className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-[#050505]">
                             <Share className="w-4 h-4" /> Chuyển tiếp
                           </button>
                           <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.text); setActiveMessageMenuId(null); }} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-[#050505]">
                             <Edit2 className="w-4 h-4" /> Chỉnh sửa
                           </button>
                           <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-red-500">
                             <Trash2 className="w-4 h-4" /> Thu hồi
                           </button>
                         </div>
                       )}
                    </div>
                  )}

                  <div className={`relative px-3 py-2 text-[15px] break-words whitespace-pre-wrap ${isMe ? 'bg-[#0084ff] text-white rounded-[20px] rounded-br-sm' : 'bg-[#f0f2f5] text-[#050505] rounded-[20px] rounded-bl-sm'} ${msg.senderId === 'tkv-ai' ? 'border border-[#e5e5e5] shadow-sm bg-white' : ''}`}>
                    {msg.type === 'poll' ? (
                      <div className="w-64">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 className="w-5 h-5 text-[#0084ff]" />
                          <p className="font-bold text-[16px] text-[#050505]">{msg.pollData?.question}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          {msg.pollData?.options.map((opt: any, i: number) => {
                            const totalVotes = msg.pollData.options.reduce((acc: number, curr: any) => acc + curr.votes.length, 0);
                            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                            const hasVoted = opt.votes.includes(currentUser.uid);
                            return (
                              <button key={i} onClick={() => handleVotePoll(msg.id, i, msg.pollData)} className="relative w-full text-left overflow-hidden rounded-lg bg-black/5 hover:bg-black/10 transition">
                                <div className="absolute top-0 left-0 bottom-0 bg-[#0084ff]/20 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                <div className="relative p-2 flex items-center justify-between z-10">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border ${hasVoted ? 'border-[#0084ff] bg-[#0084ff]' : 'border-[#65676b]'} flex items-center justify-center`}>
                                      {hasVoted && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                    <span className="text-[15px] text-[#050505]">{opt.text}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {opt.votes.length > 0 && <div className="flex -space-x-1.5">
                                      {opt.votes.slice(0, 3).map((vUid: string) => {
                                         const p = chatDetails.participantsData?.[vUid];
                                         return <img key={vUid} src={p?.photoURL || '/avatar.png'} className="w-5 h-5 rounded-full border border-white" />;
                                      })}
                                    </div>}
                                    <span className="text-[13px] text-[#65676b] font-medium">{percent}%</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-3 text-[13px] text-[#65676b] text-center">
                           {msg.pollData?.options.reduce((acc: number, curr: any) => acc + curr.votes.length, 0)} người đã bình chọn
                        </div>
                      </div>
                    ) : msg.senderId === 'tkv-ai' ? (
                       <div className="text-[14px] leading-relaxed">
                          <p className="font-bold text-[#a033ff] mb-1">TKV AI</p>
                          {msg.text}
                       </div>
                    ) : (
                      <>
                        {msg.fileType === 'image' && msg.fileUrl && <img src={msg.fileUrl} alt="Image" className="max-w-full rounded-lg mb-1" />}
                        {msg.fileType === 'video' && msg.fileUrl && <video src={msg.fileUrl} controls className="max-w-full rounded-lg mb-1" />}
                        {msg.fileType === 'audio' && msg.fileUrl && <AudioPlayer src={msg.fileUrl} isMe={isMe} />}
                        {msg.text !== 'Đã gửi một ảnh' && msg.text !== 'Đã gửi một video' && msg.text !== 'Đã gửi một tin nhắn thoại' && msg.text !== 'Đã tạo một bình chọn' && msg.text}
                      </>
                    )}

                    {hasReaction && (
                      <div className={`absolute -bottom-4 ${isMe ? 'right-0' : 'left-0'} bg-white shadow-sm border border-[#e5e5e5] rounded-full px-1.5 py-0.5 text-[12px] flex items-center gap-1`}>
                        {Object.values(msg.reactions).map((emoji: any, i) => <span key={i}>{emoji}</span>)}
                      </div>
                    )}
                  </div>

                  {!isMe && (
                    <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition ml-2 relative z-10 flex-shrink-0">
                       <button onClick={() => setActiveReactionMessageId(msg.id)} className="p-1.5 text-[#65676b] hover:bg-[#f0f2f5] rounded-full"><Smile className="w-4 h-4" /></button>
                       <button onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id)} className="p-1.5 text-[#65676b] hover:bg-[#f0f2f5] rounded-full">
                         <MoreHorizontal className="w-4 h-4" />
                       </button>
                       {activeMessageMenuId === msg.id && (
                         <div className="absolute top-10 left-0 bg-white shadow-xl border border-[#e5e5e5] rounded-xl py-2 w-48 z-30">
                           <button className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-[#050505]">
                             <Reply className="w-4 h-4" /> Trả lời
                           </button>
                           <button className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-[#050505]">
                             <Share className="w-4 h-4" /> Chuyển tiếp
                           </button>
                           <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition text-[14px] text-red-500">
                             <Trash2 className="w-4 h-4" /> Xóa
                           </button>
                         </div>
                       )}
                    </div>
                  )}

                  {isMe && <button onClick={() => setActiveReactionMessageId(msg.id)} className="opacity-0 group-hover/msg:opacity-100 p-2 text-[#65676b] hover:bg-[#f0f2f5] rounded-full transition ml-1"><Smile className="w-4 h-4" /></button>}
                </div>
              </div>
              <span className="text-[11px] text-[#65676b] mt-1 mx-9 flex items-center gap-1">
                 {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'h:mm a') : ''}
                 {msg.isEdited && <span>• Đã chỉnh sửa</span>}
              </span>
            </div>
          );
        })}
        {isTypingAI && (
          <div className="flex items-end gap-2 max-w-[70%] my-1">
            <div className="w-7 h-7 flex-shrink-0 bg-gradient-to-tr from-[#0084ff] to-[#a033ff] rounded-full flex items-center justify-center text-white text-[10px] font-bold">AI</div>
            <div className="px-4 py-3 bg-white border border-[#e5e5e5] shadow-sm rounded-[20px] rounded-bl-sm flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-[#bcc0c4] rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-[#bcc0c4] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1.5 h-1.5 bg-[#bcc0c4] rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white flex items-center gap-2 relative">
        {editingMessageId && (
          <div className="absolute -top-10 left-16 bg-[#f0f2f5] px-4 py-1.5 rounded-xl text-[13px] text-[#65676b] flex items-center gap-2 border border-[#e5e5e5] z-50">
             Đang chỉnh sửa tin nhắn...
             <button onClick={() => { setEditingMessageId(null); setNewMessage(''); }} className="hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        )}
        
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} />
          </div>
        )}
        
        {showPlusMenu && (
          <div className="absolute bottom-16 left-4 z-50 bg-white shadow-xl border border-[#e5e5e5] rounded-xl py-2 w-48">
            <button onClick={startRecording} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
              <div className="w-8 h-8 rounded-full bg-[#f0f2f5] flex items-center justify-center"><Mic className="w-4 h-4 text-[#050505]" /></div>
              <span className="text-[15px] font-medium text-[#050505]">Ghi âm</span>
            </button>
            {chatDetails.isGroup && (
               <button onClick={() => { setShowPollModal(true); setShowPlusMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
                 <div className="w-8 h-8 rounded-full bg-[#f0f2f5] flex items-center justify-center"><BarChart2 className="w-4 h-4 text-[#050505]" /></div>
                 <span className="text-[15px] font-medium text-[#050505]">Tạo bình chọn</span>
               </button>
            )}
          </div>
        )}

        <div className="flex gap-2 text-[#0084ff]">
          <button onClick={() => setShowPlusMenu(!showPlusMenu)} className="p-1 hover:bg-[#f0f2f5] rounded-full transition relative">
            <Plus className="w-6 h-6" />
          </button>
          
          <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-[#f0f2f5] rounded-full transition">
            <ImageIcon className="w-6 h-6" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*,audio/*" className="hidden" />

          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1 hover:bg-[#f0f2f5] rounded-full transition">
            <Smile className="w-6 h-6" />
          </button>
          
          <button onClick={startRecording} className="p-1 hover:bg-[#f0f2f5] rounded-full transition">
            <Mic className="w-6 h-6" />
          </button>
        </div>
        
        {mentionSearch !== null && getMentionUsers().length > 0 && (
          <div className="absolute bottom-[calc(100%+10px)] left-16 z-50 bg-white shadow-xl border border-[#e5e5e5] rounded-xl py-2 w-64 max-h-64 overflow-y-auto custom-scrollbar">
             {getMentionUsers().map(u => (
               <button key={u.id} onClick={() => handleMentionSelect(u.name)} className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] flex items-center gap-3 transition">
                 {u.icon ? (
                   <div className="w-8 h-8 rounded-full bg-[#0084ff] text-white flex items-center justify-center font-bold">{u.icon}</div>
                 ) : (
                   <img src={u.photoURL} alt={u.name} className="w-8 h-8 rounded-full object-cover bg-white border border-[#e5e5e5]" />
                 )}
                 <div className="flex flex-col">
                   <span className="text-[15px] font-medium text-[#050505]">{u.name}</span>
                   {u.sub && <span className="text-[12px] text-[#65676b]">{u.sub}</span>}
                 </div>
               </button>
             ))}
          </div>
        )}

        {isRecording ? (
          <div className="flex-1 bg-[#f0f2f5] rounded-full flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2 text-red-500 animate-pulse">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <span className="text-[15px] font-medium">{formatTime(recordingTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => stopRecording(true)} className="p-1.5 text-[#65676b] hover:bg-[#e4e6eb] rounded-full transition"><X className="w-5 h-5" /></button>
              <button onClick={() => stopRecording(false)} className="p-1.5 text-[#0084ff] hover:bg-[#e4e6eb] rounded-full transition"><Send className="w-5 h-5" /></button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex-1 bg-[#f0f2f5] rounded-full flex items-center px-4 py-2">
            {isUploading && <span className="text-sm text-[#65676b] mr-2">Đang gửi...</span>}
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Aa"
              className="w-full bg-transparent text-[15px] focus:outline-none"
              onFocus={() => { setShowEmojiPicker(false); setShowPlusMenu(false); }}
            />
          </form>
        )}
        
        {newMessage.trim() || isRecording ? (
          <button onClick={(e) => isRecording ? stopRecording(false) : handleSendMessage(e, false)} className="p-1 text-[#0084ff] hover:bg-[#f0f2f5] rounded-full transition">
            <Send className="w-6 h-6" />
          </button>
        ) : (
          <button onClick={(e) => handleSendMessage(e, true)} className="p-1 text-[#0084ff] hover:bg-[#f0f2f5] rounded-full transition">
            <ThumbsUp className="w-6 h-6" />
          </button>
        )}
      </div>
      {showPollModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
          <div className="bg-white rounded-xl w-[400px] p-4 shadow-xl">
            <div className="flex justify-between items-center mb-4 border-b border-[#e5e5e5] pb-2">
              <h2 className="text-xl font-bold text-[#050505]">Tạo bình chọn</h2>
              <button onClick={() => setShowPollModal(false)} className="p-2 hover:bg-[#f0f2f5] rounded-full transition text-[#65676b]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-[#65676b] mb-1">Câu hỏi</label>
                <input 
                  type="text" 
                  value={pollQuestion} 
                  onChange={(e) => setPollQuestion(e.target.value)} 
                  placeholder="Đặt câu hỏi..." 
                  className="w-full p-2 bg-[#f0f2f5] rounded-lg focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-semibold text-[#65676b] mb-1">Các lựa chọn</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input 
                      type="text" 
                      value={opt} 
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }} 
                      placeholder={`Lựa chọn ${i + 1}`} 
                      className="flex-1 p-2 bg-[#f0f2f5] rounded-lg focus:outline-none" 
                    />
                    {pollOptions.length > 2 && (
                      <button 
                        onClick={() => {
                          const newOpts = [...pollOptions];
                          newOpts.splice(i, 1);
                          setPollOptions(newOpts);
                        }} 
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setPollOptions([...pollOptions, ''])} 
                  className="text-[14px] text-[#0084ff] font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Thêm lựa chọn
                </button>
              </div>
              
              <button 
                onClick={handleCreatePoll}
                className="w-full py-2 bg-[#0084ff] text-white font-bold rounded-lg hover:bg-[#0073e6] transition mt-2"
              >
                Tạo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
