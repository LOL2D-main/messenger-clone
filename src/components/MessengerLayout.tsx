import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import NavigationRail from './NavigationRail';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import ChatDetails from './ChatDetails';
import PeopleView from './PeopleView';
import CallScreen from './CallScreen';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Phone } from 'lucide-react';

interface MessengerLayoutProps {
  user: User;
}

export default function MessengerLayout({ user }: MessengerLayoutProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'chat' | 'people'>('chat');
  const [showChatDetails, setShowChatDetails] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('calleeId', '==', user.uid), where('status', '==', 'ringing'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          setIncomingCall({ id: change.doc.id, ...data });
        }
        if (change.type === 'modified') {
          const data = change.doc.data();
          if (data.status === 'ended' || data.status === 'answered') {
            if (incomingCall?.id === change.doc.id) {
              setIncomingCall(null);
            }
          }
        }
        if (change.type === 'removed') {
           if (incomingCall?.id === change.doc.id) {
             setIncomingCall(null);
           }
        }
      });
    });
    return () => unsubscribe();
  }, [user, incomingCall]);

  const handleStartCall = async (chatId: string, calleeId: string, isVideoCall: boolean) => {
    if (calleeId === 'tkv-ai') {
      return;
    }
    const callDoc = await addDoc(collection(db, 'calls'), {
      chatId,
      callerId: user.uid,
      calleeId,
      status: 'ringing',
      isVideoCall
    });
    setActiveCall({
      id: callDoc.id,
      chatId,
      callerId: user.uid,
      calleeId,
      isCaller: true,
      isVideoCall
    });
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'answered' });
    setActiveCall({ ...incomingCall, isCaller: false });
    setIncomingCall(null);
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ended' });
    setIncomingCall(null);
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f2f5] overflow-hidden font-sans text-[#050505]">
      <div className={`${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <NavigationRail user={user} currentTab={currentTab} setCurrentTab={setCurrentTab} />
      </div>
      
      {currentTab === 'chat' ? (
        <>
          <div className={`w-full md:w-[360px] bg-white border-r border-[#e5e5e5] flex-shrink-0 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
            <ChatList currentUser={user} activeChatId={activeChatId} onSelectChat={setActiveChatId} />
          </div>
          <div className={`flex-1 flex-col bg-white ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
            {activeChatId ? (
              <ChatWindow 
                currentUser={user} 
                chatId={activeChatId} 
                onBack={() => setActiveChatId(null)}
                showChatDetails={showChatDetails}
                setShowChatDetails={setShowChatDetails}
                onStartCall={handleStartCall}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#65676b] font-medium">
                Chọn một đoạn chat hoặc bắt đầu cuộc trò chuyện mới
              </div>
            )}
          </div>
          {activeChatId && showChatDetails && (
            <div className="w-full absolute inset-0 md:relative md:w-[360px] bg-white border-l border-[#e5e5e5] flex-shrink-0 flex flex-col overflow-y-auto z-50 md:z-auto">
              <ChatDetails chatId={activeChatId} onClose={() => setShowChatDetails(false)} />
            </div>
          )}
        </>
      ) : (
        <PeopleView currentUser={user} onStartChat={(chatId) => { setActiveChatId(chatId); setCurrentTab('chat'); }} />
      )}

      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden shadow-lg border-4 border-white">
               <img src="/avatar.png" alt="Caller" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
               <h3 className="text-xl font-bold text-gray-900">Cuộc gọi đến</h3>
               <p className="text-gray-500">{incomingCall.isVideoCall ? 'Video call' : 'Audio call'}</p>
            </div>
            <div className="flex gap-8 mt-4">
              <button onClick={handleDeclineCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <Phone className="w-8 h-8 transform rotate-[135deg]" />
              </button>
              <button onClick={handleAcceptCall} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 animate-pulse">
                <Phone className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <CallScreen 
          chatId={activeCall.chatId} 
          callId={activeCall.id} 
          currentUser={user} 
          isCaller={activeCall.isCaller} 
          onEndCall={() => setActiveCall(null)} 
          isVideoCall={activeCall.isVideoCall} 
        />
      )}

    </div>
  );
}
