import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface CallScreenProps {
  chatId: string;
  callId: string;
  currentUser: any;
  isCaller: boolean;
  onEndCall: () => void;
  isVideoCall: boolean;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallScreen({ chatId, callId, currentUser, isCaller, onEndCall, isVideoCall }: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(isVideoCall);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState(isCaller ? 'Đang đổ chuông...' : 'Đang kết nối...');

  useEffect(() => {
    setupWebRTC();
    return () => {
      hangUp();
    };
  }, []);

  const [errorMsg, setErrorMsg] = useState('');

  const setupWebRTC = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         setErrorMsg('Trình duyệt không hỗ trợ gọi điện, vui lòng mở trong tab mới.');
         return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(servers);
      pcRef.current = pc;

      // Add local tracks to PC
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Listen for remote tracks
      pc.ontrack = (event) => {
        const [remoteStreamItem] = event.streams;
        setRemoteStream(remoteStreamItem);
        setCallStatus('Đã kết nối');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamItem;
        }
      };

      const callDoc = doc(db, 'calls', callId);
      const callerCandidatesCollection = collection(callDoc, 'callerCandidates');
      const calleeCandidatesCollection = collection(callDoc, 'calleeCandidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(isCaller ? callerCandidatesCollection : calleeCandidatesCollection, event.candidate.toJSON());
        }
      };

      if (isCaller) {
        // Create Offer
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
          sdp: offerDescription.sdp,
          type: offerDescription.type,
        };

        await updateDoc(callDoc, { offer });

        // Listen for Answer
        onSnapshot(callDoc, (snapshot) => {
          const data = snapshot.data();
          if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
            setCallStatus('Đã kết nối');
          }
          if (data?.status === 'ended') {
            hangUp();
          }
        });

        // Listen for remote ICE candidates
        onSnapshot(calleeCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              pc.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      } else {
        // Callee
        const callData = (await getDoc(callDoc)).data();
        if (callData?.offer) {
          const offerDescription = new RTCSessionDescription(callData.offer);
          await pc.setRemoteDescription(offerDescription);

          const answerDescription = await pc.createAnswer();
          await pc.setLocalDescription(answerDescription);

          const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
          };
          await updateDoc(callDoc, { answer });
        }

        // Listen for status changes
        onSnapshot(callDoc, (snapshot) => {
           const data = snapshot.data();
           if (data?.status === 'ended') {
             hangUp();
           }
        });

        // Listen for remote ICE candidates
        onSnapshot(callerCandidatesCollection, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              pc.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setErrorMsg('Vui lòng mở ứng dụng trong tab mới (nút mũi tên góc trên cùng) để gọi điện do giới hạn của trình duyệt.');
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks()[0].enabled = !isMicOn;
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current && isVideoCall) {
      localStreamRef.current.getVideoTracks()[0].enabled = !isCameraOn;
      setIsCameraOn(!isCameraOn);
    }
  };

  const hangUp = async () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    
    try {
      await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    } catch (e) {}
    
    onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-[100] flex flex-col">
      {errorMsg && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl z-[200] flex flex-col items-center gap-2">
          <span>{errorMsg}</span>
          <button onClick={hangUp} className="px-4 py-1 bg-white text-red-500 rounded font-bold mt-2">Đóng cuộc gọi</button>
        </div>
      )}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Remote Video/Audio */}
        {remoteStream ? (
          isVideoCall ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#242526]">
              <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                 <Mic className="w-12 h-12 text-white" />
              </div>
              <p className="text-white text-xl font-medium">{callStatus}</p>
              <audio ref={remoteVideoRef} autoPlay className="hidden" />
            </div>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#242526]">
            <p className="text-white text-xl">{callStatus}</p>
          </div>
        )}

        {/* Local Video */}
        {isVideoCall && (
          <div className="absolute top-4 right-4 w-24 h-36 md:w-32 md:h-48 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-gray-700 z-10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-24 bg-[#242526] flex items-center justify-center gap-6 px-6">
        <button onClick={toggleMic} className={`p-4 rounded-full ${isMicOn ? 'bg-[#3e4042] text-white hover:bg-[#4e4f50]' : 'bg-white text-black hover:bg-gray-200'} transition shadow-lg`}>
          {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        {isVideoCall && (
          <button onClick={toggleCamera} className={`p-4 rounded-full ${isCameraOn ? 'bg-[#3e4042] text-white hover:bg-[#4e4f50]' : 'bg-white text-black hover:bg-gray-200'} transition shadow-lg`}>
            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
        )}
        <button onClick={hangUp} className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition shadow-lg transform hover:scale-105">
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
