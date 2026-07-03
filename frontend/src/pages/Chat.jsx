import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import client, { API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { interestId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    // Load history first
    client
      .get(`/chat/${interestId}/messages`)
      .then((res) => setMessages(res.data.messages))
      .catch((err) => setError(err.response?.data?.error || "Could not load chat"));

    const token = localStorage.getItem("token");
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_room", { interestId }, (ack) => {
        if (!ack.ok) setError(ack.error);
      });
    });

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => socket.disconnect();
  }, [interestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit("send_message", { interestId, content: text }, (ack) => {
      if (!ack.ok) setError(ack.error);
    });
    setText("");
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2>Chat</h2>
      {error && <div className="error-text">{error}</div>}
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.senderId === user?.id ? "mine" : "theirs"}`}>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{m.sender?.name}</div>
              {m.content}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={sendMessage}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={connected ? "Type a message…" : "Connecting…"}
            disabled={!connected}
          />
          <button type="submit" disabled={!connected}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
