"use client";
import React, { useState, useEffect } from "react";
import styles from "./admin.module.css";
import { supabase } from "../supabaseClient";
import AdminWeekReservationGraph from "./AdminWeekReservationGraph";
import GalleryPostForm from "../gallery/GalleryPostForm";
import GalleryList, { GalleryPost } from "../gallery/GalleryList";
import CustomerList from "../reserve/CustomerList";

type Reservation = {
  id?: string;
  user_id?: string;
  name: string;
  menu: string;
  start_time: string;
  end_time: string;
  date: string;
};

type ModalState = {
  open: boolean;
  menu: string;
  slot: string;
  reservation: Reservation | null;
};

// 時間枠（AdminWeekReservationGraphと同じ内容でOK）
const timeSlots = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];

function getSlotIndex(time: string) {
  return timeSlots.indexOf(time);
}

const ADMIN_PASS = "0110"; // 必要に応じて.env管理も可

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [modal, setModal] = useState<ModalState>({ open: false, menu: "", slot: "", reservation: null });
  const [form, setForm] = useState({ name: "", start_time: "", end_time: "" });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'gallery' | 'customer'>('gallery');

  // 予約データ取得
  const fetchReservations = async (date: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reservations")
      .select("id, user_id, name, menu, start_time, end_time, date")
      .eq("date", date);
    // --- 自動チェック用ログ出力 ---
    console.log("[予約デバッグ] 取得データ:", data);
    if (!error && data) {
      // 1件ずつmenu, start_time, end_timeを詳細に出力
      data.forEach((r, i) => {
        console.log(`[予約デバッグ] [${i}] menu: '${r.menu}', start_time: '${r.start_time}', end_time: '${r.end_time}'`);
      });
      // 日付一致データの有無
      if (data.length === 0) {
        console.warn(`[予約デバッグ] 指定日付(${date})の予約がありません`);
      } else {
        console.log(`[予約デバッグ] 指定日付(${date})の予約件数:`, data.length);
      }
      // menuカラムの有無
      if (data.some(r => !r.menu)) {
        console.warn("[予約デバッグ] menuカラムが存在しない、または空です");
      }
      setReservations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReservations(selectedDate);
  }, [selectedDate]);

  // ギャラリー一覧＋削除
  const [galleryPosts, setGalleryPosts] = useState<GalleryPost[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const fetchGalleryPosts = async () => {
    setGalleryLoading(true);
    const { data, error } = await supabase
      .from("gallery_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setGalleryPosts(data);
    setGalleryLoading(false);
  };
  useEffect(() => { fetchGalleryPosts(); }, []);
  const handleDeleteGallery = async (id: string) => {
    if (!window.confirm('本当にこの投稿を削除しますか？')) return;
    await supabase.from('gallery_posts').delete().eq('id', id);
    fetchGalleryPosts();
  };

  // 枠クリック時
  const handleCellClick = (menu: string, slot: string) => {
    const reservation = reservations.find(r => r.menu === menu && r.start_time.slice(0,5) === slot) || null;
    setModal({ open: true, menu, slot, reservation });
    setForm({
      name: reservation?.name || "",
      start_time: reservation?.start_time?.slice(0,5) || slot,
      end_time: reservation?.end_time?.slice(0,5) || slot
    });
  };

  // モーダル閉じる
  const closeModal = () => setModal({ open: false, menu: "", slot: "", reservation: null });

  // 予約追加・編集
  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time || !modal.menu) return;
    setLoading(true);
    if (modal.reservation && modal.reservation.id) {
      // 編集（update）
      await supabase
        .from("reservations")
        .update({
          menu: modal.menu,
          name: form.name,
          start_time: form.start_time + ":00",
          end_time: form.end_time + ":00",
          date: selectedDate
        })
        .eq("id", modal.reservation.id);
    } else {
      // 追加（insert）
      await supabase
        .from("reservations")
        .insert({
          menu: modal.menu,
          name: form.name,
          start_time: form.start_time + ":00",
          end_time: form.end_time + ":00",
          date: selectedDate
        });
    }
    await fetchReservations(selectedDate);
    setLoading(false);
    closeModal();
  };

  // 予約削除
  const handleDelete = async () => {
    if (modal.reservation && modal.reservation.id) {
      setLoading(true);
      await supabase
        .from("reservations")
        .delete()
        .eq("id", modal.reservation.id);
      await fetchReservations(selectedDate);
      setLoading(false);
    }
    closeModal();
  };

  // セルが予約の開始枠かどうか
  const isReservationStart = (res: Reservation, slot: string) => res.start_time.slice(0,5) === slot;
  // セルが予約の範囲内かどうか
  const isReservationInRange = (res: Reservation, slot: string) => {
    const startIdx = getSlotIndex(res.start_time.slice(0,5));
    const endIdx = getSlotIndex(res.end_time.slice(0,5));
    const slotIdx = getSlotIndex(slot);
    return startIdx <= slotIdx && slotIdx < endIdx;
  };

  // ギャラリーモーダル
  const [galleryModal, setGalleryModal] = useState<{open: boolean, post: GalleryPost|null}>({open: false, post: null});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAuthed(localStorage.getItem('adminAuthed') === 'true');
    }
  }, []);

  const handleLogin = () => {
    if (input === ADMIN_PASS) {
      setAuthed(true);
      localStorage.setItem('adminAuthed', 'true');
    } else {
      alert('パスワードが違います');
    }
  };

  if (!authed) {
    return (
      <main className={styles.container}>
        <div style={{maxWidth:340, margin:'80px auto', background:'#fff', borderRadius:18, boxShadow:'0 4px 16px rgba(200,180,160,0.13)', padding:'32px 24px', display:'flex', flexDirection:'column', alignItems:'center'}}>
          <h2 style={{color:'#bfae9e', fontWeight:700, fontSize:22, marginBottom:24}}>管理者パスワードを入力</h2>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            maxLength={8}
            style={{fontSize:20, borderRadius:10, border:'1.5px solid #f3b6c2', padding:'10px 18px', marginBottom:18, width:'100%', textAlign:'center', color:'#a88c7d'}}
            placeholder="4桁の数字"
            inputMode="numeric"
          />
          <button
            onClick={handleLogin}
            style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:10, padding:'12px 32px', fontWeight:700, fontSize:18, cursor:'pointer', boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}
          >ログイン</button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>予約管理</h1>
      <AdminWeekReservationGraph />
      {/* タブ切り替えボタン */}
      <div style={{display:'flex', gap:16, justifyContent:'center', margin:'32px 0'}}>
        <button
          onClick={() => setTab('gallery')}
          style={{
            background: tab === 'gallery' ? '#f3b6c2' : '#fff',
            color: tab === 'gallery' ? '#fff' : '#bfae9e',
            border: '1.5px solid #f3b6c2',
            borderRadius: 10,
            padding: '10px 32px',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: tab === 'gallery' ? '0 2px 8px rgba(243,182,194,0.10)' : 'none',
            transition: 'all 0.2s',
          }}
        >ギャラリー一覧</button>
        <button
          onClick={() => setTab('customer')}
          style={{
            background: tab === 'customer' ? '#f3b6c2' : '#fff',
            color: tab === 'customer' ? '#fff' : '#bfae9e',
            border: '1.5px solid #f3b6c2',
            borderRadius: 10,
            padding: '10px 32px',
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: tab === 'customer' ? '0 2px 8px rgba(243,182,194,0.10)' : 'none',
            transition: 'all 0.2s',
          }}
        >顧客管理</button>
      </div>
      {/* タブ内容 */}
      {tab === 'gallery' && (
        <>
          <div style={{marginTop: 40, width: '100%', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto'}}>
            <GalleryPostForm />
          </div>
          <div style={{marginTop: 40, width: '100%', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto'}}>
            <h2 style={{fontWeight:700, color:'#bfae9e', fontSize:20, marginBottom:18, textAlign:'center'}}>ギャラリー一覧（管理）</h2>
            <GalleryList posts={galleryPosts} loading={galleryLoading} adminMode onDelete={handleDeleteGallery} />
          </div>
        </>
      )}
      {tab === 'customer' && (
        <div style={{marginTop: 40, width: '100%', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto'}}>
          <h2 style={{fontWeight:700, color:'#bfae9e', fontSize:20, marginBottom:18, textAlign:'center'}}>顧客管理</h2>
          <CustomerList />
        </div>
      )}
      {/* ギャラリーモーダル（ギャラリータブ時のみ表示） */}
      {tab === 'gallery' && galleryModal.open && galleryModal.post && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.18)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center'
        }} onClick={()=>setGalleryModal({open:false, post:null})}>
          <div style={{background:'#fff', borderRadius:16, minWidth:280, maxWidth:400, padding:0, boxShadow:'0 4px 24px rgba(200,180,160,0.18)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', alignItems:'stretch'}} onClick={e=>e.stopPropagation()}>
            {/* 上部画像 */}
            <div style={{width:'100%', background:'#eee'}}>
              <img src={galleryModal.post.image_url} alt={galleryModal.post.description} style={{width:'100%', maxHeight:340, objectFit:'cover', display:'block'}} />
            </div>
            {/* 内容 */}
            <div style={{padding:'16px 18px 12px 18px'}}>
              <div style={{fontWeight:700, color:'#bfae9e', marginBottom:6}}>{galleryModal.post.posted_by || "Nail.nail"}</div>
              <div style={{color:'#a88c7d', fontSize:14, marginBottom:6}}>{galleryModal.post.description}</div>
              <div style={{marginBottom:6, color:'#a88c7d', fontSize:13}}>
                {(galleryModal.post.tags || []).map((tag:string, j:number) => (
                  <span key={j} style={{background:'#fbeee6', color:'#e7bfa7', borderRadius:8, padding:'2px 8px', marginRight:6}}># {tag}</span>
                ))}
              </div>
              <div style={{color:'#bfae9e', fontSize:12}}>{galleryModal.post.created_at?.slice(0,10)}</div>
              <button onClick={()=>handleDeleteGallery(galleryModal.post!.id)} style={{marginTop:18, background:'#e57373', color:'#fff', border:'none', borderRadius:8, padding:'8px 22px', fontWeight:600, cursor:'pointer', alignSelf:'flex-end'}}>削除</button>
            </div>
            <button style={{margin:'12px 18px 18px 18px', background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'10px 0', fontWeight:600, cursor:'pointer', width:'calc(100% - 36px)'}} onClick={() => setGalleryModal({open:false, post:null})}>閉じる</button>
          </div>
        </div>
      )}
    </main>
  );
} 