import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Landing } from "./routes/Landing";
import { SessionRoom } from "./routes/SessionRoom";

export default function App() {
  const loc = useLocation();
  return (
    <>
      <div className="orb o1" />
      <div className="orb o2" />
      <div className="noise" />
      <div className="container">
        <Routes location={loc} key={loc.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/s/:sessionId" element={<SessionRoom />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}


