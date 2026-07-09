import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const displayName = user.displayName || 'Người dùng';
        
        // Remove diacritics and spaces
        const removeDiacritics = (str: string) => {
          return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        };
        const customId = removeDiacritics(displayName).replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 10000).toString();
        
        await setDoc(userRef, {
          uid: user.uid,
          displayName: displayName,
          email: user.email,
          photoURL: user.photoURL || '/avatar.png',
          customId: customId,
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } else {
        await setDoc(userRef, {
          lastSeen: serverTimestamp(),
          isOnline: true
        }, { merge: true });
      }

    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isRegister) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        const displayName = `${lastName} ${firstName}`.trim();
        
        // Remove diacritics and spaces
        const removeDiacritics = (str: string) => {
          return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        };
        const customId = removeDiacritics(displayName).replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 10000).toString();
        
        await updateProfile(user, {
          displayName: displayName,
          photoURL: '/avatar.png'
        });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: displayName,
          email: user.email,
          photoURL: '/avatar.png',
          customId: customId,
          dob: dob,
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        await setDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không đúng.');
      } else {
        setError(error.message);
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white font-sans">
      <div className="flex flex-col items-center w-full max-w-[400px] px-6">
        <p className="text-[#65676b] mb-8 text-[15px]">Tiếng Việt (Việt Nam)</p>
        
        <img 
          src="/logo.png" 
          alt="Messenger" 
          className="w-20 h-20 mb-10 rounded-3xl object-contain bg-white" 
        />

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleEmailAuth} className="w-full flex flex-col gap-4">
          {isRegister && (
            <>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Họ"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-1/2 p-4 bg-[#f5f6f8] border border-[#ccd0d5] rounded-[10px] focus:outline-none focus:border-[#0084ff] text-[15px]"
                  required
                />
                <input
                  type="text"
                  placeholder="Tên"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-1/2 p-4 bg-[#f5f6f8] border border-[#ccd0d5] rounded-[10px] focus:outline-none focus:border-[#0084ff] text-[15px]"
                  required
                />
              </div>
              <input
                type="date"
                placeholder="Ngày tháng năm sinh"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full p-4 bg-[#f5f6f8] border border-[#ccd0d5] rounded-[10px] focus:outline-none focus:border-[#0084ff] text-[15px] text-[#65676b]"
                required
              />
            </>
          )}

          <input
            type="text"
            placeholder="Số di động hoặc email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 bg-[#f5f6f8] border border-[#ccd0d5] rounded-[10px] focus:outline-none focus:border-[#0084ff] text-[15px]"
            required
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-[#f5f6f8] border border-[#ccd0d5] rounded-[10px] focus:outline-none focus:border-[#0084ff] text-[15px]"
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-[#65676b]"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#0084ff] text-white font-bold text-[17px] rounded-[10px] hover:bg-[#0073e6] transition mt-2"
          >
            {isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </form>

        {!isRegister && (
          <button className="text-[#050505] font-medium mt-6 text-[15px]">
            Quên mật khẩu?
          </button>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full mt-6 py-3.5 flex justify-center items-center gap-2 border border-[#ccd0d5] text-[#050505] font-semibold text-[17px] rounded-[10px] hover:bg-[#f5f6f8] transition"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Đăng nhập bằng Google
        </button>

        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-6 py-3.5 border border-[#0084ff] text-[#0084ff] font-semibold text-[17px] rounded-[10px] hover:bg-[#e7f3ff] transition"
        >
          {isRegister ? 'Bạn đã có tài khoản?' : 'Tạo tài khoản mới'}
        </button>

        <div className="mt-10 flex items-center justify-center gap-1 text-[#65676b] font-medium text-[15px]">
          <span className="text-[20px]">∞</span> Meta
        </div>
      </div>
    </div>
  );
}

