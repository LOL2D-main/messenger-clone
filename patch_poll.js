const fs = require('fs');
const file = 'src/components/ChatWindow.tsx';
let content = fs.readFileSync(file, 'utf8');

const insertPoint = content.indexOf('const handleSendMessage =');
if (insertPoint !== -1) {
    const pollFuncs = `
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
    
    // Check if user already voted for this option
    const voteIndex = option.votes.indexOf(uid);
    if (voteIndex > -1) {
      option.votes.splice(voteIndex, 1);
    } else {
      option.votes.push(uid);
    }
    
    await updateDoc(doc(db, 'messages', messageId), {
      'pollData.options': newOptions
    });
  };

  `;
    content = content.slice(0, insertPoint) + pollFuncs + content.slice(insertPoint);
    fs.writeFileSync(file, content);
}
