import React, { useState, useEffect } from 'react';
import { Bell, Home, Database, Search, Plus, Edit2, Trash2, Eye, X, AlertCircle, CheckCircle, AlertTriangle, TrendingUp, Activity, Menu, Upload, Image as ImageIcon, History, FileText, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { db } from './firebase'; // Import Firebase
import { ref, onValue, push, set, remove, update } from "firebase/database";

const MooCareApp = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [showNotification, setShowNotification] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCRUDModal, setShowCRUDModal] = useState(false);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [crudMode, setCrudMode] = useState('add');
  const [selectedCow, setSelectedCow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  
  // History Filters State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyTimeFilter, setHistoryTimeFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const [notificationData, setNotificationData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // REAL DATA FROM FIREBASE
  const [cowData, setCowData] = useState([]);
  const [detectionData, setDetectionData] = useState([]);
  const [activeCowId, setActiveCowId] = useState(null); // Which cow is currently being monitored by ESP

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    // 1. Listen to 'cows'
    const cowsRef = ref(db, 'cows');
    onValue(cowsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedCows = Object.keys(data).map(key => ({
          dbId: key, // Firebase Key
          ...data[key]
        }));
        setCowData(loadedCows);
      } else {
        setCowData([]);
      }
    });

    // 2. Listen to 'detections' (History)
    const detectionsRef = ref(db, 'detections');
    onValue(detectionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedDetections = Object.keys(data).map(key => ({
          dbId: key,
          ...data[key]
        })).reverse(); // Show newest first
        setDetectionData(loadedDetections);
        
        // Populate Notifications form Mastitis cases
        const alerts = loadedDetections
          .filter(d => d.status === 'Terindikasi Mastitis')
          .map((d, index) => ({
             id: index,
             cowId: d.cowId,
             type: 'danger',
             title: 'Terindikasi Mastitis',
             message: `Sapi ${d.cowId} terdeteksi gejala mastitis!`,
             time: d.date.split(' ')[1] || '-',
             date: d.date.split(' ')[0] || '-',
             read: false
          }));
        setNotifications(alerts);
      } else {
        setDetectionData([]);
        setNotifications([]);
      }
    });
    
    // 3. Listen to 'control/activeCowId' (Sync with ESP)
    const activeCowRef = ref(db, 'control/activeCowId');
    onValue(activeCowRef, (snapshot) => {
        setActiveCowId(snapshot.val());
    });

  }, []);

  // NEW: Sync selectedCow in the modal with live updates from Firebase (Real-time Image update)
  useEffect(() => {
    if (showDetailModal && selectedCow) {
       const liveCow = cowData.find(c => c.dbId === selectedCow.dbId);
       if (liveCow) {
          // Update jika ada perubahan data (terutama iotImage atau sensor)
          setSelectedCow(prev => ({ ...prev, ...liveCow }));
       }
    }
  }, [cowData, showDetailModal, selectedCow?.dbId]); // Removed selectedCow full object dependency to prevent loop

  // Form state untuk CRUD
  const [formData, setFormData] = useState({
    id: '', weight: '', gender: 'Betina', breed: '', age: '', cage: '', profilePhoto: null
  });

  // Hitung statistik
  const stats = {
    totalCows: cowData.length,
    checkedCows: detectionData.length, // Simplified
    avgTemp: detectionData.length > 0 ? (detectionData.reduce((sum, d) => sum + parseFloat(d.temp || 0), 0) / detectionData.length).toFixed(1) : 0,
    avgConductivity: detectionData.length > 0 ? (detectionData.reduce((sum, d) => sum + parseFloat(d.conductivity || 0), 0) / detectionData.length).toFixed(2) : 0,
  };

  // Data untuk grafik status
  const statusData = [
    { name: 'Normal', value: detectionData.filter(d => d.status === 'Normal').length, color: '#10b981' },
    { name: 'Waspada', value: detectionData.filter(d => d.status === 'Waspada').length, color: '#f59e0b' },
    { name: 'Mastitis', value: detectionData.filter(d => d.status === 'Terindikasi Mastitis').length, color: '#ef4444' },
  ];

  // Data untuk grafik pemeriksaan -> Simplified
  const checkData = [
    { name: 'Sudah Diperiksa', value: detectionData.length, color: '#3b82f6' },
  ];
  
  // Data tren suhu (PERBAIKAN: tempTrend sebelumnya terhapus)
  const tempTrend = detectionData.map(d => ({
    sapi: d.cowId,
    suhu: parseFloat(d.temp || 0),
    konduktivitas: parseFloat(d.conductivity || 0)
  }));

  // Handle CRUD with Firebase
  const handleAddCow = () => {
    setCrudMode('add');
    setFormData({ id: '', weight: '', gender: 'Betina', breed: '', age: '', cage: '', profilePhoto: null });
    setShowCRUDModal(true);
  };

  const handleEditCow = (cow) => {
    setCrudMode('edit');
    setFormData(cow);
    setShowCRUDModal(true);
  };

  const handleDeleteCow = (dbId) => {
    if (confirm('Yakin ingin menghapus data sapi ini?')) {
      remove(ref(db, `cows/${dbId}`));
    }
  };

  const handleSaveCow = () => {
    if (crudMode === 'add') {
      // Use push() to generate unique key, but we store 'id' (e.g. S001) as a field
      const newCowRef = push(ref(db, 'cows'));
      set(newCowRef, formData);
    } else {
      // Update existing
      update(ref(db, `cows/${formData.dbId}`), formData);
    }
    setShowCRUDModal(false);
  };
  
  // Feature: Select Cow for IoT Device
  const handleSelectForDevice = (cowDbId, cowVisibleId) => {
      set(ref(db, 'control/activeCowId'), cowDbId);
      alert(`Sapi ${cowVisibleId} terpilih! Alat ESP32 sekarang akan mengirim data untuk sapi ini.`);
  };

  const handleViewDetail = (detection) => {
    const cow = cowData.find(c => c.id === detection.cowId) || {};
    // FIX: Prioritize detection's iotImage over cow's iotImage
    // This ensures each detection shows its own captured photo at that moment
    setSelectedCow({ ...cow, ...detection }); // Detection data overwrites cow data
    setValidationResult(null); 
    setShowDetailModal(true);
  };


   const [analysisImage, setAnalysisImage] = useState(null);
   const [analysisPreview, setAnalysisPreview] = useState(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [analysisResult, setAnalysisResult] = useState(null);

   const handleAnalysisUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
         setAnalysisImage(file);
         setAnalysisPreview(URL.createObjectURL(file));
         setAnalysisResult(null);
      }
   };

   const conductAnalysis = async () => {
      if (!analysisImage && !analysisPreview) return;
      
      setIsAnalyzing(true);
      setAnalysisResult(null);

      try {
         const formData = new FormData();
         if (analysisImage) {
            formData.append('image', analysisImage);
         } else {
            formData.append('imageUrl', analysisPreview); 
         }

         const response = await fetch('/api/predict', {
            method: 'POST',
            body: formData,
         });

         const data = await response.json();
         
         if (response.ok) {
            setAnalysisResult({
               status: data.result,
               confidence: data.confidence,
               raw_score: data.raw_score
            });
         } else {
            alert('Error: ' + data.error);
         }
      } catch (error) {
         console.error(error);
         alert('Gagal menghubungi server AI');
      } finally {
         setIsAnalyzing(false);
      }
   };
   
   // ... rest of component



  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredCowData = cowData.filter(cow => 
    (cow.id && cow.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cow.breed && cow.breed.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDetectionData = detectionData.filter(detection => 
    detection.cowId && detection.cowId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Logic for History Page
  const filteredHistoryData = detectionData.filter(item => {
    // Search Filter
    const matchesSearch = (item.cowId && item.cowId.toLowerCase().includes(historySearchTerm.toLowerCase())) || 
                          (item.status && item.status.toLowerCase().includes(historySearchTerm.toLowerCase()));
    
    // Status Filter
    const matchesStatus = historyStatusFilter === 'all' || item.status === historyStatusFilter;

    // Time Filter (Mock logic - assuming current date is 2025-01-10 for simulation or real date comparison)
    let matchesTime = true;
    const itemDate = new Date(item.date); // e.g. "2025-01-10 08:30"
    const today = new Date('2025-01-10'); // Simulated 'Today' for consistency with mock data
    
    if (historyTimeFilter === 'today') {
       matchesTime = itemDate.toDateString() === today.toDateString();
    } else if (historyTimeFilter === 'week') {
       const weekAgo = new Date(today);
       weekAgo.setDate(today.getDate() - 7);
       matchesTime = itemDate >= weekAgo;
    } else if (historyTimeFilter === 'month') {
       const monthAgo = new Date(today);
       monthAgo.setMonth(today.getMonth() - 1);
       matchesTime = itemDate >= monthAgo;
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  const handleValidateMastitis = async (imageUrl) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const formData = new FormData();
      formData.append('imageUrl', imageUrl);

      const response = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setValidationResult(`${data.result} (${data.confidence})`);
      } else {
        setValidationResult('Error: ' + data.error);
      }
    } catch (error) {
      console.error("Error validating:", error);
      setValidationResult('Gagal terhubung ke server AI');
    } finally {
      setIsValidating(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(22, 163, 74); // Green 600
    doc.text('MooCare - Laporan Deteksi Mastitis', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
    doc.text(`Filter: ${historyTimeFilter}, Status: ${historyStatusFilter}`, 14, 35);

    // Table
    const tableColumn = ["No", "Kode Sapi", "Status", "Suhu", "Konduktivitas", "Waktu"];
    const tableRows = [];

    filteredHistoryData.forEach((item, index) => {
      const rowData = [
        index + 1, // Sequential number
        item.cowId || '-',
        item.status || '-',
        item.temp ? `${item.temp}°C` : '-',
        item.conductivity ? `${item.conductivity} mS/m` : '-',
        item.date || '-',
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 163, 74] }, // Green
    });

    doc.save(`Laporan_MooCare_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Custom Tooltip untuk grafik
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Jumlah: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Persentase: <span className="font-bold">
              {((payload[0].value / detectionData.length) * 100).toFixed(1)}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen bg-gray-50 font-quicksand overflow-hidden text-gray-800">
      
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}></div>
           <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-xs bg-white flex flex-col shadow-2xl animate-slideInLeft">
               <div className="h-24 flex items-center justify-between px-6 border-b border-gray-50 bg-white">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md border border-green-100 p-2">
                        <img src="/assets/cow-icon.png" alt="Cow" onError={(e) => {e.target.onerror = null; e.target.src='https://cdn-icons-png.flaticon.com/512/2395/2395796.png'}} className="w-full h-full object-contain" />
                      </div>
                      <div>
                         <h1 className="font-bold text-green-600 text-xl leading-tight">MooCare</h1>
                         <p className="text-[10px] text-gray-500 font-medium">Monitoring System</p>
                      </div>
                  </div>
                  <button 
                    onClick={() => setShowMobileSidebar(false)} 
                    className="text-gray-400 hover:text-gray-800 transition p-1"
                  >
                      <X className="w-5 h-5" />
                  </button>
               </div>
               
               <nav className="flex-1 px-5 py-6 space-y-3 overflow-y-auto">
                    <p className="px-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menu Navigasi</p>
                    <button 
                      onClick={() => { setActivePage('dashboard'); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 border ${activePage === 'dashboard' ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'}`}
                    >
                      <div className={`p-2 rounded-lg ${activePage === 'dashboard' ? 'bg-white' : 'bg-gray-100'}`}>
                         <Home className={`w-5 h-5 ${activePage === 'dashboard' ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <span className="font-bold text-sm">Dashboard</span>
                    </button>
                    <button 
                      onClick={() => { setActivePage('history'); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 border ${activePage === 'history' ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'}`}
                    >
                      <div className={`p-2 rounded-lg ${activePage === 'history' ? 'bg-white' : 'bg-gray-100'}`}>
                         <History className={`w-5 h-5 ${activePage === 'history' ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <span className="font-bold text-sm">Data Deteksi</span>
                    </button>
                    <button 
                      onClick={() => { activePage !== 'data' && setActivePage('data'); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 border ${activePage === 'data' ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'}`}
                    >
                      <div className={`p-2 rounded-lg ${activePage === 'data' ? 'bg-white' : 'bg-gray-100'}`}>
                         <Database className={`w-5 h-5 ${activePage === 'data' ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <span className="font-bold text-sm">Data Sapi</span>
                    </button>
                    <button 
                      onClick={() => { activePage !== 'analysis' && setActivePage('analysis'); setShowMobileSidebar(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 border ${activePage === 'analysis' ? 'bg-green-50 text-green-700 border-green-100 shadow-sm' : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'}`}
                    >
                      <div className={`p-2 rounded-lg ${activePage === 'analysis' ? 'bg-white' : 'bg-gray-100'}`}>
                         <Eye className={`w-5 h-5 ${activePage === 'analysis' ? 'text-green-600' : 'text-gray-500'}`} />
                      </div>
                      <span className="font-bold text-sm">Cek Mastitis</span>
                    </button>
               </nav>

               <div className="p-4 border-t border-gray-50">
                    <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                       <p className="font-bold text-sm mb-1">Status Sistem</p>
                       <div className="flex items-center gap-2 text-xs text-green-100 mb-3">
                          <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                          Online
                       </div>
                    </div>
               </div>
           </aside>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden lg:flex flex-col z-20 shadow-sm">
        <div className="py-6 flex flex-col items-center justify-center border-b border-gray-50 bg-gradient-to-b from-white to-gray-50/50 gap-3">
           <div className="relative group cursor-pointer">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 border-2 border-green-50 transform group-hover:rotate-6 transition-all duration-300">
                 <span className="text-4xl filter drop-shadow-sm">🐮</span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-600 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                 <Activity className="w-3 h-3" />
              </div>
           </div>
           <div className="text-center">
              <h1 className="font-bold text-green-600 text-xl tracking-tight">MooCare</h1>
              <p className="text-[10px] text-gray-500 font-medium">Monitoring System</p>
           </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu Utama</p>
            <button 
              onClick={() => setActivePage('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activePage === 'dashboard' ? 'bg-green-50 text-green-700 shadow-sm translate-x-1' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'}`}
            >
               <Home className={`w-5 h-5 transition-colors ${activePage === 'dashboard' ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600'}`} />
               <span className="font-semibold">Dashboard</span>
               {activePage === 'dashboard' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"></div>}
            </button>
            <button 
              onClick={() => setActivePage('history')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activePage === 'history' ? 'bg-green-50 text-green-700 shadow-sm translate-x-1' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'}`}
            >
               <History className={`w-5 h-5 transition-colors ${activePage === 'history' ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600'}`} />
               <span className="font-semibold">Data Deteksi</span>
               {activePage === 'history' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"></div>}
            </button>
            <button 
              onClick={() => setActivePage('data')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activePage === 'data' ? 'bg-green-50 text-green-700 shadow-sm translate-x-1' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'}`}
            >
               <Database className={`w-5 h-5 transition-colors ${activePage === 'data' ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600'}`} />
               <span className="font-semibold">Data Sapi</span>
               {activePage === 'data' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"></div>}
            </button>
            <button 
              onClick={() => setActivePage('analysis')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activePage === 'analysis' ? 'bg-green-50 text-green-700 shadow-sm translate-x-1' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1'}`}
            >
               <Eye className={`w-5 h-5 transition-colors ${activePage === 'analysis' ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600'}`} />
               <span className="font-semibold">Cek Mastitis</span>
               {activePage === 'analysis' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600"></div>}
            </button>
        </nav>

      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50/50">
         
         {/* Top Header */}
         <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 flex items-center justify-between px-8 z-10 flex-shrink-0 sticky top-0">
             <div className="flex items-center gap-4">
                 <button 
                  onClick={() => setShowMobileSidebar(true)}
                  className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                 >
                    <Menu className="w-6 h-6" />
                 </button>
                 <div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-800 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 truncate max-w-[200px] md:max-w-none">
                        {activePage === 'dashboard' ? 'Dashboard Overview' : activePage === 'history' ? 'Data Deteksi' : activePage === 'analysis' ? 'Analisis Cepat' : 'Manajemen Data Sapi'}
                    </h2>
                    <p className="text-xs text-gray-500 hidden md:block">Selamat datang kembali, Admin</p>
                 </div>
             </div>

             <div className="flex items-center gap-6">
                 {/* Search Bar - Global for Data/Dashboard */}
                 {activePage !== 'history' && (
                   <div className="hidden md:flex items-center bg-gray-50 rounded-full border border-gray-200 px-4 py-2.5 w-72 focus-within:ring-2 focus-within:ring-green-100 focus-within:border-green-400 transition-all shadow-sm">
                      <Search className="w-4 h-4 text-gray-400 mr-3" />
                      <input 
                        type="text" 
                        placeholder="Cari data sapi..." 
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                 )}

                 <div className="flex items-center gap-4">
                     <button 
                       onClick={() => setShowNotificationList(!showNotificationList)}
                       className="relative p-2.5 rounded-full hover:bg-gray-100 text-gray-500 transition hover:text-green-600 group"
                     >
                        <Bell className={`w-6 h-6 transition-transform group-hover:rotate-12 ${unreadCount > 0 ? 'text-green-600' : ''}`} />
                        {unreadCount > 0 && (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                     </button>
                     
                     <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>
                     
                     <div className="flex items-center gap-3 pl-1 cursor-pointer hover:opacity-80 transition">
                        <div className="text-right hidden md:block">
                           <p className="text-sm font-bold text-gray-700">Rizal Hakim</p>
                           <p className="text-xs text-gray-500">Administrator</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 p-0.5 shadow-md shadow-green-100 group">
                           <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                              <span className="font-bold text-green-600 group-hover:scale-110 transition">RH</span>
                           </div>
                        </div>
                     </div>
                 </div>
             </div>
         </header>

         {/* Content Area */}
         <main className="flex-1 overflow-y-auto p-6 md:p-8 relative scroll-smooth">
            
            {/* Mobile Search Bar (Only visible on mobile and if not history page) */}
            {activePage !== 'history' && (
               <div className="md:hidden mb-6">
                   <div className="flex items-center bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-green-100 focus-within:border-green-400 transition-all">
                      <Search className="w-5 h-5 text-gray-400 mr-3" />
                      <input 
                        type="text" 
                        placeholder="Cari data sapi..." 
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-400" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
               </div>
            )}

            {/* Notification Popup (Absolute) */}
            {showNotification && notificationData && (
              <div className="fixed top-24 right-8 z-50 bg-white border-l-4 border-red-500 p-5 rounded-xl shadow-2xl max-w-sm animate-slideInRight">
                 <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full">
                       <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                       <h4 className="font-bold text-red-600">Terdeteksi Mastitis!</h4>
                       <p className="text-sm text-gray-600 mt-1 mb-3">Sapi <span className="font-bold">{notificationData.cowId}</span> menunjukkan gejala.</p>
                       <div className="flex gap-2">
                          <button onClick={() => { handleViewDetail(notificationData); setShowNotification(false); }} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition">Lihat Detail</button>
                          <button onClick={() => setShowNotification(false)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">Abaikan</button>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {/* Notification Dropdown */}
            {showNotificationList && (
               <div className="absolute top-4 right-4 md:right-8 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 w-72 md:w-80 overflow-hidden animate-scaleUp origin-top-right">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-gray-800">Notifikasi</h3>
                     <span className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">{unreadCount} Baru</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                     {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Tidak ada notifikasi</div>
                     ) : (
                        notifications.map(notif => (
                           <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition ${!notif.read ? 'bg-blue-50/50' : ''}`}>
                              <div className="flex gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {notif.type === 'danger' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                 </div>
                                 <div>
                                    <p className={`text-sm font-semibold ${notif.type === 'danger' ? 'text-red-600' : 'text-gray-800'}`}>{notif.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            )}

            {activePage === 'dashboard' && (
               <div className="space-y-8 animate-fadeIn">
                  
                  {/* Stats Cards - Colorful Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                     {/* System Status Card */}
                     <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg shadow-gray-200 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition duration-500"></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                                 <Activity className="w-6 h-6 text-green-400" />
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold bg-green-500/20 px-2 py-1 rounded-full text-green-400 border border-green-500/30">
                                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                 Online
                              </div>
                           </div>
                           <h3 className="text-lg font-bold mb-2">Status Sistem</h3>
                           <button className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-bold text-white transition flex items-center justify-center gap-2" onClick={() => alert('Sistem terhubung ke Firebase Realtime Database')}>
                              Cek Koneksi ESP32
                           </button>
                        </div>
                     </div>

                     {/* Blue Card */}
                     <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition duration-500"></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                 <Activity className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-blue-50">+2.5%</span>
                           </div>
                           <h3 className="text-3xl font-bold mb-1">{stats.totalCows}</h3>
                           <p className="text-blue-100 text-sm font-medium">Total Sapi</p>
                        </div>
                     </div>

                     {/* Sky Card */}
                     <div className="bg-gradient-to-br from-sky-400 to-sky-500 rounded-2xl p-6 text-white shadow-lg shadow-sky-200 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition duration-500"></div>
                         <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                 <CheckCircle className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-sky-50">Hari Ini</span>
                           </div>
                           <h3 className="text-3xl font-bold mb-1">{stats.checkedCows}</h3>
                           <p className="text-sky-100 text-sm font-medium">Sudah Diperiksa</p>
                        </div>
                     </div>

                     {/* Purple Card */}
                     <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-200 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition duration-500"></div>
                         <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                 <TrendingUp className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-purple-50">Stabil</span>
                           </div>
                           <h3 className="text-3xl font-bold mb-1">{stats.avgTemp}°C</h3>
                           <p className="text-purple-100 text-sm font-medium">Rata-rata Suhu</p>
                        </div>
                     </div>

                     {/* Emerald Card */}
                     <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition duration-500"></div>
                         <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                 <Activity className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full text-emerald-50">Normal</span>
                           </div>
                           <h3 className="text-3xl font-bold mb-1">{stats.avgConductivity}</h3>
                           <p className="text-emerald-100 text-sm font-medium">Avg Konduktivitas</p>
                        </div>
                     </div>
                  </div>

                  {/* Charts & Graphs Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     
                     {/* Health Status Pie */}
                     <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                           <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                           Status Kesehatan
                        </h3>
                        <div className="flex-1 flex items-center justify-center">
                           <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                 <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                 </Pie>
                                 <Tooltip content={<CustomTooltip />} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4">
                           {statusData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                                 <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                 {item.name}
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Trends Chart */}
                     <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="font-bold text-gray-800 flex items-center gap-2">
                              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                              Tren Monitoring Kesehatan
                           </h3>
                           <select className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-3 py-2 text-gray-600 outline-none">
                              <option>Hari Ini</option>
                              <option>7 Hari Terakhir</option>
                              <option>Bulan Ini</option>
                           </select>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                           <BarChart data={tempTrend} barGap={8}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="sapi" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                              <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                              <Legend iconType="circle" />
                              <Bar yAxisId="left" dataKey="suhu" fill="#f59e0b" name="Suhu (°C)" radius={[4, 4, 0, 0]} barSize={20} />
                              <Bar yAxisId="right" dataKey="konduktivitas" fill="#3b82f6" name="Konduktivitas" radius={[4, 4, 0, 0]} barSize={20} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Recent Detections - Modern Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                           <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                           Hasil Deteksi Terbaru
                        </h3>
                        <button className="text-sm text-green-600 hover:text-green-700 font-medium">Lihat Semua</button>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead className="bg-gray-50/50">
                              <tr>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Kode Sapi</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status Kesehatan</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Suhu</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Konduktivitas</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Waktu</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredDetectionData.map((detection) => (
                                 <tr key={detection.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4">
                                       <div className="font-bold text-gray-800">{detection.cowId}</div>
                                       <div className="text-xs text-gray-400">ID: {detection.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                          detection.status === 'Normal' ? 'bg-green-50 text-green-700 border border-green-100' :
                                          detection.status === 'Waspada' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                          'bg-red-50 text-red-700 border border-red-100'
                                       }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                             detection.status === 'Normal' ? 'bg-green-500' :
                                             detection.status === 'Waspada' ? 'bg-yellow-500' :
                                             'bg-red-500'
                                          }`}></span>
                                          {detection.status}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{detection.temp}°C</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-600">{detection.conductivity} mS/m</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{detection.date}</td>
                                    <td className="px-6 py-4">
                                       <button onClick={() => handleViewDetail(detection)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition">
                                          <Eye className="w-5 h-5" />
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {activePage === 'history' && (
               <div className="space-y-6 animate-fadeIn">
                  {/* History Filters & Actions */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                     <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                         <div>
                            <h2 className="text-lg font-bold text-gray-800">Data Deteksi</h2>
                            <p className="text-sm text-gray-500">Arsip lengkap hasil pemeriksaan kesehatan sapi.</p>
                         </div>
                         <button 
                           onClick={exportToPDF}
                           className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-200"
                         >
                            <FileText className="w-5 h-5" />
                            <span className="font-semibold">Export PDF</span>
                         </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                        {/* Search History */}
                        <div className="md:col-span-2 relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <input 
                             type="text" 
                             placeholder="Cari ID Sapi atau Status..." 
                             className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                             value={historySearchTerm}
                             onChange={(e) => setHistorySearchTerm(e.target.value)}
                           />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                           <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <select 
                             className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none appearance-none cursor-pointer"
                             value={historyTimeFilter}
                             onChange={(e) => setHistoryTimeFilter(e.target.value)}
                           >
                              <option value="all">Semua Waktu</option>
                              <option value="today">Hari Ini</option>
                              <option value="week">7 Hari Terakhir</option>
                              <option value="month">1 Bulan Terakhir</option>
                           </select>
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                           <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                           <select 
                             className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none appearance-none cursor-pointer"
                             value={historyStatusFilter}
                             onChange={(e) => setHistoryStatusFilter(e.target.value)}
                           >
                              <option value="all">Semua Status</option>
                              <option value="Normal">Normal</option>
                              <option value="Waspada">Waspada</option>
                              <option value="Terindikasi Mastitis">Terindikasi Mastitis</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* History Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead className="bg-gray-50/50">
                              <tr>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Kode Sapi</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status Kesehatan</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Suhu</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Konduktivitas</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Waktu Deteksi</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Detail</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredHistoryData.length > 0 ? (
                                filteredHistoryData.map((detection) => (
                                 <tr key={detection.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4 font-bold text-gray-800">{detection.cowId}</td>
                                    <td className="px-6 py-4">
                                       <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                          detection.status === 'Normal' ? 'bg-green-50 text-green-700 border border-green-100' :
                                          detection.status === 'Waspada' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                          'bg-red-50 text-red-700 border border-red-100'
                                       }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                             detection.status === 'Normal' ? 'bg-green-500' :
                                             detection.status === 'Waspada' ? 'bg-yellow-500' :
                                             'bg-red-500'
                                          }`}></span>
                                          {detection.status}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{detection.temp}°C</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{detection.conductivity} mS/m</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{detection.date}</td>
                                    <td className="px-6 py-4">
                                       <button onClick={() => handleViewDetail(detection)} className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline">
                                          Lihat
                                       </button>
                                    </td>
                                 </tr>
                                ))
                              ) : (
                                <tr>
                                   <td colSpan="6" className="px-6 py-10 text-center text-gray-400 text-sm">
                                      Tidak ada data deteksi yang cocok dengan filter.
                                   </td>
                                </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {activePage === 'data' && (
               <div className="space-y-6 animate-fadeIn">
                  {/* Data Management Header */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                     <div>
                        <h2 className="text-lg font-bold text-gray-800">Daftar Sapi Perah</h2>
                        <p className="text-sm text-gray-500">Kelola database sapi, tambah, edit, atau hapus data.</p>
                     </div>
                     <button
                       onClick={handleAddCow}
                       className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200"
                     >
                        <Plus className="w-5 h-5" />
                        <span className="font-semibold">Tambah Sapi Baru</span>
                     </button>
                  </div>

                  {/* Cows Grid/Table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead className="bg-gray-50/50">
                              <tr>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Identitas Sapi</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fisik</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ras/Bangsa</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Umur</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Lokasi</th>
                                 <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-50">
                              {filteredCowData.map((cow) => (
                                 <tr key={cow.id} className="hover:bg-gray-50/50 transition group">
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                             <Activity className="w-5 h-5" />
                                          </div>
                                          <div>
                                             <div className="font-bold text-gray-800">{cow.id}</div>
                                             <div className="text-xs text-gray-400">{cow.gender}</div>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded-md">{cow.weight} kg</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{cow.breed}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{cow.age} Tahun</td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                          {cow.cage || 'General'}
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                          <button 
                                            onClick={() => handleSelectForDevice(cow.dbId, cow.id)} 
                                            className={`p-2 rounded-lg ${activeCowId === cow.dbId ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                            title="Pilih sapi ini untuk alat IoT"
                                          >
                                             <Activity className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => handleEditCow(cow)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                             <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => handleDeleteCow(cow.dbId)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                             <Trash2 className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {activePage === 'analysis' && (
               <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                  <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center">
                     <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8" />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2">Cek Kesehatan Ambing (AI)</h2>
                     <p className="text-gray-500 max-w-lg mx-auto mb-8">Unggah foto ambing sapi untuk dianalisis oleh kecerdasan buatan. Sistem akan mendeteksi indikasi Mastitis secara otomatis.</p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Upload Section */}
                        <div className="space-y-4">
                           <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:bg-gray-50 transition cursor-pointer relative group">
                              <input 
                                 type="file" 
                                 accept="image/*"
                                 onChange={handleAnalysisUpload}
                                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-blue-500 transition" />
                              <p className="font-bold text-gray-600">Klik atau geser foto ke sini</p>
                              <p className="text-xs text-gray-400 mt-1">JPG, PNG (Max 5MB)</p>
                           </div>
                           
                           <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                 <div className="w-full border-t border-gray-200"></div>
                              </div>
                              <div className="relative flex justify-center text-sm">
                                 <span className="px-2 bg-white text-gray-400">Atau gunakan URL</span>
                              </div>
                           </div>

                           <div className="flex gap-2">
                              <input 
                                 type="text" 
                                 placeholder="https://example.com/image.jpg"
                                 className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                 onChange={(e) => {
                                    setAnalysisPreview(e.target.value);
                                    setAnalysisImage(null);
                                    setAnalysisResult(null);
                                 }}
                              />
                           </div>
                        </div>

                        {/* Preview Section */}
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                           {analysisPreview ? (
                              <div className="relative w-full h-full min-h-[250px] rounded-xl overflow-hidden shadow-md group">
                                 <img src={analysisPreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                                 {isAnalyzing && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                                       <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                                       <p className="font-bold animate-pulse">Menganalisis...</p>
                                    </div>
                                 )}
                              </div>
                           ) : (
                              <div className="text-center text-gray-400">
                                 <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                 <p className="text-sm">Preview foto akan muncul di sini</p>
                              </div>
                           )}
                           
                           {analysisResult && (
                              <div className={`w-full mt-4 p-4 rounded-xl border flex items-center gap-4 animate-scaleUp ${
                                 analysisResult.status === 'Normal' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                              }`}>
                                 <div className={`p-2 rounded-full ${analysisResult.status === 'Normal' ? 'bg-green-200' : 'bg-red-200'}`}>
                                    {analysisResult.status === 'Normal' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                 </div>
                                 <div className="text-left flex-1">
                                    <p className="text-xs font-bold uppercase opacity-70">Hasil Deteksi</p>
                                    <h3 className="font-bold text-xl">{analysisResult.status}</h3>
                                    <p className="text-xs mt-1">Tingkat Keyakinan: <span className="font-bold">{analysisResult.confidence}</span></p>
                                 </div>
                              </div>
                           )}

                           <button 
                              onClick={conductAnalysis}
                              disabled={!analysisPreview || isAnalyzing}
                              className={`w-full mt-4 py-3 rounded-xl font-bold text-white shadow-lg transition ${
                                 !analysisPreview || isAnalyzing ? 'bg-gray-300 cursor-not-allowed transform-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-1'
                              }`}
                           >
                              {isAnalyzing ? 'Sedang Memproses...' : 'Mulai Analisis AI'}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </main>
      </div>

      {/* Modal Detail - Glassmorphism */}
      {showDetailModal && selectedCow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}></div>
           <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-scaleUp">
              <div className={`h-32 ${selectedCow.status === 'Normal' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : selectedCow.status === 'Waspada' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-red-500 to-pink-600'} p-6 relative`}>
                 <button onClick={() => setShowDetailModal(false)} className="absolute top-6 right-6 text-white/80 hover:text-white bg-black/10 rounded-full p-2 backdrop-blur-sm transition">
                    <X className="w-5 h-5" />
                 </button>
                 <div className="absolute -bottom-10 left-8 flex items-end">
                    <div className="w-24 h-24 bg-white rounded-2xl shadow-lg p-2 flex items-center justify-center">
                       <span className="text-4xl">🐮</span>
                    </div>
                    <div className="ml-4 mb-11 text-white">
                       <h3 className="text-2xl font-bold">{selectedCow.id}</h3>
                       <p className="text-white/80 text-sm">{selectedCow.breed}</p>
                    </div>
                 </div>
              </div>

              <div className="pt-14 px-8 pb-8">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                       <p className="text-gray-500 text-sm">Status Kesehatan</p>
                       <span className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-sm font-bold ${
                          selectedCow.status === 'Normal' ? 'bg-green-100 text-green-700' :
                          selectedCow.status === 'Waspada' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                       }`}>
                          {selectedCow.status}
                       </span>
                    </div>
                    <div className="text-right">
                       <p className="text-gray-500 text-sm">Terakhir Diperiksa</p>
                       <p className="font-bold text-gray-800">{selectedCow.date}</p>
                    </div>
                 </div>

                 {/* Dual Image Grid: Profile & Capture */}
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* CONTAINER 1: PROFILE PHOTO (Foto Statis Sapi) */}
                    <div className="col-span-1">
                       <div className="relative aspect-video rounded-xl bg-gray-100 overflow-hidden border border-gray-200 group">
                          {selectedCow.profilePhoto && !selectedCow.profilePhoto.includes('capture_') ? ( 
                             <img src={selectedCow.profilePhoto} alt="Profil" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8 opacity-50 mb-1" />
                                <span className="text-[10px] font-bold uppercase">No Profile</span>
                             </div>
                          )}
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase">
                             Profil Sapi
                          </div>
                       </div>
                    </div>
                    
                    {/* CONTAINER 2: IOT LIVE FEED (Foto dari ESP32) */}
                    <div className="col-span-1">
                       <div className="relative aspect-video rounded-xl bg-gray-900 overflow-hidden border-2 border-green-500/50 group">
                          {selectedCow.iotImage ? (
                             <img 
                                key={selectedCow.iotImage} // Force re-render on change
                                src={selectedCow.iotImage} 
                                alt="Live Capture" 
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                                style={{ transform: 'rotate(180deg)' }}
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = "https://via.placeholder.com/300x200?text=Error+Loading+Image";
                                }}
                             />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-green-500">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mb-2"></div>
                                <span className="text-[10px] font-mono tracking-widest text-center">
                                   LIVE FEED OFF<br/>
                                   <span className="text-[8px] opacity-60 normal-case">(Menunggu Foto dari ESP32 Sapi ID: {selectedCow.id})</span>
                                </span>
                             </div>
                          )}
                          <div className="absolute top-2 left-2 bg-green-600/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase flex items-center gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                             Alat IoT
                          </div>
                          
                          {/* Scan Line Animation */}
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent w-full h-1/2 animate-slideIn"></div>
                       </div>

                       {/* AI Validation Control */}
                       <div className="mt-3">
                          <button 
                              onClick={() => handleValidateMastitis(selectedCow.iotImage)}
                              disabled={isValidating || !selectedCow.iotImage}
                              className={`w-full py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition flex items-center justify-center gap-2 ${
                                 isValidating 
                                 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                 : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                          >
                              {isValidating ? (
                                 <>
                                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    Menganalisis...
                                 </>
                              ) : (
                                 <>
                                    <Activity className="w-4 h-4" />
                                    Cek Validasi AI
                                 </>
                              )}
                          </button>
                          
                          {validationResult && (
                             <div className={`mt-3 p-3 rounded-lg flex items-center gap-3 border ${
                                validationResult.includes('Normal') 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : validationResult.includes('Mastitis') 
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                             }`}>
                                <div className={`p-1.5 rounded-full ${
                                    validationResult.includes('Normal') ? 'bg-green-200' : 
                                    validationResult.includes('Mastitis') ? 'bg-red-200' : 'bg-gray-200'
                                }`}>
                                   {validationResult.includes('Normal') ? <CheckCircle className="w-4 h-4" /> : 
                                    validationResult.includes('Mastitis') ? <AlertTriangle className="w-4 h-4" /> : 
                                    <AlertCircle className="w-4 h-4" />}
                                </div>
                                <div>
                                   <p className="text-xs font-bold uppercase opacity-60">Hasil Analisis</p>
                                   <p className="font-bold text-sm">{validationResult}</p>
                                </div>
                             </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="bg-orange-100 p-2 rounded-lg">
                             <TrendingUp className="w-5 h-5 text-orange-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-600">Suhu Ambing</p>
                       </div>
                       <p className="text-2xl font-bold text-gray-800">{selectedCow.temp}°C</p>
                       <p className="text-xs text-green-600">Normal range: 38-39°C</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                       <div className="flex items-center gap-3 mb-2">
                          <div className="bg-blue-100 p-2 rounded-lg">
                             <Activity className="w-5 h-5 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium text-gray-600">Konduktivitas</p>
                       </div>
                       <p className="text-2xl font-bold text-gray-800">{selectedCow.conductivity} mS/m</p>
                    </div>
                 </div>

                 <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-3">Informasi Fisik</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                       <div>
                          <p className="text-gray-500">Berat Badan</p>
                          <p className="font-semibold text-gray-800">{selectedCow.weight} kg</p>
                       </div>
                       <div>
                          <p className="text-gray-500">Umur</p>
                          <p className="font-semibold text-gray-800">{selectedCow.age} Tahun</p>
                       </div>
                       <div>
                          <p className="text-gray-500">Jenis Kelamin</p>
                          <p className="font-semibold text-gray-800">{selectedCow.gender}</p>
                       </div>
                       <div>
                          <p className="text-gray-500">Lokasi Kandang</p>
                          <p className="font-semibold text-gray-800">{selectedCow.cage || '-'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="mt-6 flex gap-3">
                    <button onClick={() => setShowDetailModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
                       Tutup
                    </button>
                    <button className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                       Cetak Laporan
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal CRUD - Clean & Simple */}
      {showCRUDModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCRUDModal(false)}></div>
           <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 animate-scaleUp overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                 <h3 className="font-bold text-lg text-gray-800">{crudMode === 'add' ? 'Tambah Data Sapi' : 'Edit Data Sapi'}</h3>
                 <button onClick={() => setShowCRUDModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-xs font-bold text-gray-500 uppercase">Kode Sapi</label>
                       <input 
                         type="text" 
                         value={formData.id}
                         onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                         disabled={crudMode === 'edit'}
                         className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50"
                         placeholder="ex: S001"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 uppercase">Berat (kg)</label>
                       <input 
                         type="number"
                         value={formData.weight}
                         onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                         className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 uppercase">Umur</label>
                       <input 
                         type="number"
                         value={formData.age}
                         onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                         className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 uppercase">Jenis Kelamin</label>
                       <select 
                         value={formData.gender}
                         onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                         className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                       >
                          <option value="Betina">Betina</option>
                          <option value="Jantan">Jantan</option>
                       </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Bangsa</label>
                        <input 
                          type="text"
                          value={formData.breed}
                          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                          className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>
                    
                    {/* Image Upload Field */}
                    <div className="col-span-2 mt-2">
                       <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Foto Sapi</label>
                       <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm relative group">
                              {formData.profilePhoto ? (
                                <img src={formData.profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                              )}
                              {formData.profilePhoto && (
                                <button 
                                  onClick={() => setFormData({...formData, profilePhoto: null})}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                          </div>
                          <div className="flex-1">
                              <label className="cursor-pointer inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-50 hover:border-green-500 hover:text-green-600 transition shadow-sm">
                                <Upload className="w-4 h-4" />
                                {formData.profilePhoto ? 'Ganti Foto' : 'Upload Foto Baru'}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const url = URL.createObjectURL(e.target.files[0]);
                                      setFormData({ ...formData, profilePhoto: url });
                                    }
                                  }}
                                />
                              </label>
                              <p className="text-[10px] text-gray-400 mt-2">Format: JPG, PNG. Ukuran Max: 5MB.</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                 <button onClick={() => setShowCRUDModal(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition">Batal</button>
                 <button onClick={handleSaveCow} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200">
                    {crudMode === 'add' ? 'Simpan Data' : 'Perbarui Data'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default MooCareApp;