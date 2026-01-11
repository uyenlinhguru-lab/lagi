
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  PlusCircle, 
  Trophy, 
  Trash2, 
  Save, 
  Sparkles,
  FileText,
  Video,
  Music,
  Download,
  Search,
  ThumbsUp,
  Share2,
  MessageSquare
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { 
  CategoryType, 
  Contestant, 
  CATEGORY_LABELS 
} from './types';
import { 
  MAX_SCORES, 
  SPECIFIC_CRITERIA_LABELS,
  SOCIAL_EXCHANGE_RATES
} from './constants';

// --- Helper Components ---
const supabase = (window as any).supabase

const SidebarItem: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const ScoreInput: React.FC<{
  label: string;
  value: number;
  max: number;
  onChange: (val: number) => void;
}> = ({ label, value, max, onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center text-sm">
      <label className="font-medium text-slate-700">{label}</label>
      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">
        {value}/{max}đ
      </span>
    </div>
    <input 
      type="range"
      min="0"
      max={max}
      step="0.5"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

const InteractionInput: React.FC<{
  label: string;
  icon: React.ReactNode;
  count: number;
  points: number;
  maxPoints: number;
  rate: number;
  onChange: (count: number) => void;
}> = ({ label, icon, count, points, maxPoints, rate, onChange }) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
        {icon}
        {label}
      </div>
      <div className="text-xs font-bold px-2 py-1 bg-white rounded-lg border border-slate-100 text-blue-600 shadow-sm">
        {points.toFixed(1)} / {maxPoints}đ
      </div>
    </div>
    <div className="relative">
      <input 
        type="number"
        min="0"
        value={count || ''}
        placeholder="0"
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Lượt</span>
    </div>
    <p className="text-[10px] text-slate-400 italic">Quy đổi: {rate} lượt = 1đ</p>
  </div>
);

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scoring' | 'list'>('dashboard');
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Scoring Form State
  const [name, setName] = useState('');
  const [entryCode, setEntryCode] = useState('');
  const [category, setCategory] = useState<CategoryType>(CategoryType.VIDEO);
  const [general, setGeneral] = useState({ topic: 0, mention: 0, emotion: 0, message: 0, compliance: 0 });
  const [specific, setSpecific] = useState({ criteria1: 0, criteria2: 0, criteria3: 0 });
  
  // Social Media interaction counts
  const [socialCounts, setSocialCounts] = useState({ like: 0, share: 0, comment: 0 });
  
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // Thang điểm tối đa tổng cộng (Được tính động từ constants)
  const maxTotalScore = useMemo(() => {
    const gen = Object.values(MAX_SCORES.general).reduce((a, b) => a + b, 0);
    const spec = Object.values(MAX_SCORES.specific).reduce((a, b) => a + b, 0);
    const soc = Object.values(MAX_SCORES.social).reduce((a, b) => a + b, 0);
    return gen + spec + soc;
  }, []);

  const maxSocialScore = useMemo(() => {
    return Object.values(MAX_SCORES.social).reduce((a, b) => a + b, 0);
  }, []);

  // Calculate Points from Counts
  const socialPoints = useMemo(() => {
    return {
      like: Math.min(MAX_SCORES.social.like, socialCounts.like / SOCIAL_EXCHANGE_RATES.like),
      share: Math.min(MAX_SCORES.social.share, socialCounts.share / SOCIAL_EXCHANGE_RATES.share),
      comment: Math.min(MAX_SCORES.social.comment, socialCounts.comment / SOCIAL_EXCHANGE_RATES.comment)
    };
  }, [socialCounts]);

  // Stats Calculations
  const stats = useMemo(() => {
    const total = contestants.length;
    const avgScore = total > 0 ? contestants.reduce((acc, c) => acc + c.totalScore, 0) / total : 0;
    const topContestant = [...contestants].sort((a, b) => b.totalScore - a.totalScore)[0];
    
    const categoryCount = contestants.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, avgScore: avgScore.toFixed(1), topContestant, categoryCount };
  }, [contestants]);

  const filteredContestants = useMemo(() => {
    return contestants.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.entryCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contestants, searchQuery]);

  const currentTotal = useMemo(() => {
    const genSum = general.topic + general.mention + general.emotion + general.message + general.compliance;
    const specSum = specific.criteria1 + specific.criteria2 + specific.criteria3;
    const socSum = socialPoints.like + socialPoints.share + socialPoints.comment;
    return parseFloat((genSum + specSum + socSum).toFixed(2));
  }, [general, specific, socialPoints]);

  const handleSaveScore = async () => {
    if (!name || !entryCode) {
      alert("Vui lòng nhập tên và mã số dự thi!");
      return;
    }

    let aiFeedback = '';
    setIsGeneratingFeedback(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là một giám khảo chuyên nghiệp của cuộc thi "Lagi City Land & Tôi". 
      Thí sinh: ${name}, Mã số: ${entryCode}, Thể loại: ${CATEGORY_LABELS[category]}.
      Điểm số đạt được: ${currentTotal}/${maxTotalScore}.
      Chi tiết điểm: 
      - Chung: ${general.topic + general.mention + general.emotion + general.message + general.compliance}/60
      - Riêng: ${specific.criteria1 + specific.criteria2 + specific.criteria3}/20
      - Tương tác mạng xã hội: ${ (socialPoints.like + socialPoints.share + socialPoints.comment).toFixed(1) }/${maxSocialScore} 
        (Chi tiết: Like ${socialCounts.like}, Share ${socialCounts.share}, Comment ${socialCounts.comment})
      Hãy viết một lời nhận xét ngắn gọn (khoảng 2 câu) khích lệ thí sinh dựa trên mức điểm này.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      aiFeedback = response.text || '';
    } catch (e) {
      console.error("AI feedback error", e);
    } finally {
      setIsGeneratingFeedback(false);
    }

    const newContestant: Contestant = {
      id: Math.random().toString(36).substring(7),
      name,
      entryCode,
      category,
      general,
      specific,
      social: {
        likeCount: socialCounts.like,
        shareCount: socialCounts.share,
        commentCount: socialCounts.comment,
        likePoints: socialPoints.like,
        sharePoints: socialPoints.share,
        commentPoints: socialPoints.comment
      },
      totalScore: currentTotal,
      timestamp: Date.now(),
      aiFeedback
    };

    setContestants(prev => [newContestant, ...prev]);
    // Reset form
    setName('');
    setEntryCode('');
    setGeneral({ topic: 0, mention: 0, emotion: 0, message: 0, compliance: 0 });
    setSpecific({ criteria1: 0, criteria2: 0, criteria3: 0 });
    setSocialCounts({ like: 0, share: 0, comment: 0 });
    setActiveTab('list');
  };

  const deleteContestant = (id: string) => {
    if(confirm("Bạn có chắc chắn muốn xóa kết quả này?")) {
      setContestants(prev => prev.filter(c => c.id !== id));
    }
  };

  const exportCSV = () => {
    const headers = "Tên,Mã Số,Thể Loại,Tổng Điểm,Like,Share,Comment\n";
    const rows = contestants.map(c => `${c.name},${c.entryCode},${CATEGORY_LABELS[c.category]},${c.totalScore},${c.social.likeCount},${c.social.shareCount},${c.social.commentCount}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ket_qua_cham_diem_lagi.csv");
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col fixed h-full shadow-sm z-10">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
            L
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Lagi City Land</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold italic">Phòng Giám Khảo</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={<BarChart3 size={20} />} 
            label="Tổng quan (Dashboard)" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={<PlusCircle size={20} />} 
            label="Chấm điểm mới" 
            active={activeTab === 'scoring'} 
            onClick={() => setActiveTab('scoring')} 
          />
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Danh sách thí sinh" 
            active={activeTab === 'list'} 
            onClick={() => setActiveTab('list')} 
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Dữ liệu hiện tại</p>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${Math.min(contestants.length * 5, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{contestants.length} Thí sinh đã chấm</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-72 p-10 max-w-7xl mx-auto w-full">
        
        {/* Header Section */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Bảng Điều Khiển'}
              {activeTab === 'scoring' && 'Hệ Thống Chấm Điểm'}
              {activeTab === 'list' && 'Quản Lý Thí Sinh'}
            </h2>
            <p className="text-slate-500 mt-1">
              {activeTab === 'scoring' ? 'Nhập số liệu thực tế để hệ thống tự động quy đổi điểm.' : 'Chào mừng, Ban Giám Khảo. Hãy theo dõi tiến độ cuộc thi.'}
            </p>
          </div>
          <div className="flex gap-4">
            {activeTab === 'list' && contestants.length > 0 && (
              <button 
                onClick={exportCSV}
                className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                <Download size={18} /> Xuất CSV
              </button>
            )}
            {activeTab !== 'scoring' && (
              <button 
                onClick={() => setActiveTab('scoring')}
                className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-xl text-white hover:bg-blue-700 transition-all font-medium text-sm shadow-md"
              >
                <PlusCircle size={18} /> Chấm điểm nhanh
              </button>
            )}
          </div>
        </header>

        {/* Tab Contents */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                    <Users size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Tổng thí sinh</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                    <Trophy size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Điểm TB ({maxTotalScore}đ)</p>
                  <h3 className="text-3xl font-bold mt-1">{stats.avgScore}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                    <Sparkles size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Dẫn đầu</p>
                  <h3 className="text-xl font-bold mt-1 truncate">{stats.topContestant?.name || '---'}</h3>
                  <p className="text-xs text-slate-400 mt-1">{stats.topContestant?.entryCode || ''}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
                    <BarChart3 size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Tương tác cao nhất</p>
                  <h3 className="text-3xl font-bold mt-1">
                    {contestants.length > 0 ? Math.max(...contestants.map(c => c.social.likeCount + c.social.shareCount + c.social.commentCount)) : 0}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-bold text-slate-900">Top 5 Thí sinh gần đây</h4>
                    <span className="text-xs text-slate-400 font-medium">Thang {maxTotalScore}đ</span>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contestants.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="entryCode" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, maxTotalScore]} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="totalScore" radius={[4, 4, 0, 0]} fill="#3b82f6" barSize={32}>
                          {contestants.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#94a3b8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categories Breakdown */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h4 className="font-bold text-slate-900 mb-6">Cơ cấu bài thi</h4>
                  <div className="space-y-6">
                    {[CategoryType.VIDEO, CategoryType.ARTICLE, CategoryType.SONG].map(cat => (
                      <div key={cat} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          cat === CategoryType.VIDEO ? 'bg-red-50 text-red-600' :
                          cat === CategoryType.ARTICLE ? 'bg-blue-50 text-blue-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          {cat === CategoryType.VIDEO ? <Video size={20} /> : cat === CategoryType.ARTICLE ? <FileText size={20} /> : <Music size={20} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold text-slate-700">{CATEGORY_LABELS[cat]}</span>
                            <span className="text-slate-400 text-sm font-medium">{stats.categoryCount[cat] || 0} bài</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                cat === CategoryType.VIDEO ? 'bg-red-500' :
                                cat === CategoryType.ARTICLE ? 'bg-blue-500' :
                                'bg-emerald-500'
                              }`} 
                              style={{ width: `${stats.total ? ((stats.categoryCount[cat] || 0) / stats.total) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scoring' && (
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              {/* Form Entry */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-8 pb-4 border-b border-slate-100">
                  <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                  <h4 className="text-xl font-bold text-slate-900">1. Thông tin thí sinh</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Tên thí sinh / Tác giả</label>
                    <input 
                      type="text"
                      placeholder="VD: Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Mã số dự thi</label>
                    <input 
                      type="text"
                      placeholder="VD: LG-2024-001"
                      value={entryCode}
                      onChange={(e) => setEntryCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="mt-8">
                  <label className="text-sm font-semibold text-slate-700 mb-3 block">Chọn thể loại bài thi</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[CategoryType.VIDEO, CategoryType.ARTICLE, CategoryType.SONG].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                          category === cat 
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700 ring-1 ring-blue-500 shadow-sm' 
                          : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {cat === CategoryType.VIDEO ? <Video /> : cat === CategoryType.ARTICLE ? <FileText /> : <Music />}
                        <span className="font-bold text-xs uppercase tracking-wide">{CATEGORY_LABELS[cat]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* General Criteria (60 pts) */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                    <h4 className="text-xl font-bold text-slate-900">2. Tiêu chí chung (60đ)</h4>
                  </div>
                  <span className="text-blue-600 font-bold px-3 py-1 bg-blue-50 rounded-full">
                    {general.topic + general.mention + general.emotion + general.message + general.compliance}/60
                  </span>
                </div>
                <div className="space-y-6">
                  <ScoreInput label="Đúng chủ đề" value={general.topic} max={MAX_SCORES.general.topic} onChange={(v) => setGeneral({...general, topic: v})} />
                  <ScoreInput label="Nhắc đến Lagi City Land" value={general.mention} max={MAX_SCORES.general.mention} onChange={(v) => setGeneral({...general, mention: v})} />
                  <ScoreInput label="Cảm xúc & tính chân thật" value={general.emotion} max={MAX_SCORES.general.emotion} onChange={(v) => setGeneral({...general, emotion: v})} />
                  <ScoreInput label="Thông điệp truyền tải" value={general.message} max={MAX_SCORES.general.message} onChange={(v) => setGeneral({...general, message: v})} />
                  <ScoreInput label="Tuân thủ thể lệ" value={general.compliance} max={MAX_SCORES.general.compliance} onChange={(v) => setGeneral({...general, compliance: v})} />
                </div>
              </div>

              {/* Specific Criteria (20 pts) */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-xl font-bold text-slate-900">3. Tiêu chí riêng theo thể loại (20đ)</h4>
                  </div>
                  <span className="text-emerald-600 font-bold px-3 py-1 bg-emerald-50 rounded-full">
                    {specific.criteria1 + specific.criteria2 + specific.criteria3}/20
                  </span>
                </div>
                <div className="space-y-6">
                  <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c1} value={specific.criteria1} max={MAX_SCORES.specific.criteria1} onChange={(v) => setSpecific({...specific, criteria1: v})} />
                  <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c2} value={specific.criteria2} max={MAX_SCORES.specific.criteria2} onChange={(v) => setSpecific({...specific, criteria2: v})} />
                  <ScoreInput label={SPECIFIC_CRITERIA_LABELS[category].c3} value={specific.criteria3} max={MAX_SCORES.specific.criteria3} onChange={(v) => setSpecific({...specific, criteria3: v})} />
                </div>
              </div>

              {/* Social Media (21 pts) - Updated for new formulas */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                    <h4 className="text-xl font-bold text-slate-900">4. Tương tác mạng xã hội ({maxSocialScore}đ)</h4>
                  </div>
                  <span className="text-purple-600 font-bold px-3 py-1 bg-purple-50 rounded-full">
                    {(socialPoints.like + socialPoints.share + socialPoints.comment).toFixed(1)}/{maxSocialScore}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InteractionInput 
                    label="Lượt Like" 
                    icon={<ThumbsUp size={16} className="text-blue-500" />}
                    count={socialCounts.like}
                    points={socialPoints.like}
                    maxPoints={MAX_SCORES.social.like}
                    rate={SOCIAL_EXCHANGE_RATES.like}
                    onChange={(val) => setSocialCounts({...socialCounts, like: val})}
                  />
                  <InteractionInput 
                    label="Lượt Share" 
                    icon={<Share2 size={16} className="text-emerald-500" />}
                    count={socialCounts.share}
                    points={socialPoints.share}
                    maxPoints={MAX_SCORES.social.share}
                    rate={SOCIAL_EXCHANGE_RATES.share}
                    onChange={(val) => setSocialCounts({...socialCounts, share: val})}
                  />
                  <InteractionInput 
                    label="Lượt Comment" 
                    icon={<MessageSquare size={16} className="text-purple-500" />}
                    count={socialCounts.comment}
                    points={socialPoints.comment}
                    maxPoints={MAX_SCORES.social.comment}
                    rate={SOCIAL_EXCHANGE_RATES.comment}
                    onChange={(val) => setSocialCounts({...socialCounts, comment: val})}
                  />
                </div>
              </div>

              {/* Floating Submit Bar */}
              <div className="sticky bottom-6 glass-card p-6 rounded-3xl shadow-2xl flex items-center justify-between border-2 border-blue-100 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tổng điểm quy đổi</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-blue-600 tracking-tighter">{currentTotal}</span>
                    <span className="text-slate-400 font-bold text-xl">/ {maxTotalScore}</span>
                  </div>
                </div>
                <button 
                  onClick={handleSaveScore}
                  disabled={isGeneratingFeedback}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-70 flex items-center gap-3"
                >
                  {isGeneratingFeedback ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Save size={24} /> Lưu & Nhận xét AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Tìm theo tên hoặc mã số dự thi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                      <th className="px-6 py-4">Mã Số</th>
                      <th className="px-6 py-4">Thí Sinh</th>
                      <th className="px-6 py-4">Thể Loại</th>
                      <th className="px-6 py-4">Chi tiết điểm (C-R-T)</th>
                      <th className="px-6 py-4 text-center">Tổng Điểm</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredContestants.length > 0 ? filteredContestants.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                            {c.entryCode}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase mt-0.5">{new Date(c.timestamp).toLocaleString('vi-VN')}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            {c.category === CategoryType.VIDEO ? <Video size={14} className="text-red-500" /> : c.category === CategoryType.ARTICLE ? <FileText size={14} className="text-blue-500" /> : <Music size={14} className="text-emerald-500" />}
                            {CATEGORY_LABELS[c.category]}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 font-bold rounded">
                              C:{ (c.general.topic + c.general.mention + c.general.emotion + c.general.message + c.general.compliance) }
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 font-bold rounded">
                              R:{ (c.specific.criteria1 + c.specific.criteria2 + c.specific.criteria3) }
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 font-bold rounded">
                              T:{ (c.social.likePoints + c.social.sharePoints + c.social.commentPoints).toFixed(1) }
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2 opacity-60">
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5"><ThumbsUp size={10}/> {c.social.likeCount}</span>
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5"><Share2 size={10}/> {c.social.shareCount}</span>
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5"><MessageSquare size={10}/> {c.social.commentCount}</span>
                          </div>
                          {c.aiFeedback && (
                            <p className="text-xs italic text-slate-400 mt-2 max-w-xs line-clamp-1 border-l-2 border-slate-100 pl-2">{c.aiFeedback}</p>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`text-2xl font-black ${
                            c.totalScore >= (maxTotalScore * 0.9) ? 'text-amber-500' :
                            c.totalScore >= (maxTotalScore * 0.8) ? 'text-emerald-600' :
                            'text-slate-900'
                          }`}>
                            {c.totalScore}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => deleteContestant(c.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Users size={48} className="opacity-20" />
                            <p className="text-sm font-medium">Chưa có kết quả nào được ghi nhận.</p>
                            <button 
                              onClick={() => setActiveTab('scoring')}
                              className="text-blue-600 hover:underline font-bold"
                            >
                              Bắt đầu chấm bài
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
