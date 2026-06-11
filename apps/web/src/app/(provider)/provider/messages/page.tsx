import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MessageSquare, Search, Send, Lock } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ProviderMessagesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PROVIDER") {
    redirect("/login");
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          Secure Messages
        </h1>
        <p className="text-slate-500 mt-1 flex items-center gap-2">
          <Lock className="w-4 h-4" /> End-to-end encrypted patient communication.
        </p>
      </div>

      {/* Messages Interface Shell */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Sidebar: Conversations List */}
        <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-center">
             <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
             <p className="text-sm font-medium text-slate-900">No active conversations</p>
             <p className="text-xs text-slate-500 mt-1">When patients reach out, their messages will appear here.</p>
          </div>
        </div>

        {/* Right Side: Active Chat Window (Empty State) */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-blue-300 ml-1" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Select a Conversation</h3>
            <p className="text-slate-500 mt-1 max-w-sm">
              Choose a patient from the list to view their message history and reply securely.
            </p>
          </div>
          
          {/* Disabled Input Area */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3 opacity-50 pointer-events-none">
              <input 
                type="text" 
                placeholder="Type a secure reply..." 
                disabled
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none"
              />
              <button className="p-3 bg-blue-600 text-white rounded-xl">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
