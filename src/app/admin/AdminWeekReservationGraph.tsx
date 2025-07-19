import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const timeSlots = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"
];

function getWeekDates(startDate: Date) {
  const week: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    week.push(d.toISOString().slice(0, 10));
  }
  return week;
}

const today = new Date();
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function getSlotIndex(time: string) {
  return timeSlots.indexOf(time);
}

type Reservation = {
  id: string;
  name: string;
  menu: string;
  start_time: string;
  end_time: string;
  date: string;
};

export default function AdminWeekReservationGraph() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(today));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{open: boolean, reservation: Reservation|null}>({open: false, reservation: null});
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', menu: '', start_time: '', end_time: '' });
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]); // 予約不可日
  const [unavailableTimes, setUnavailableTimes] = useState<{date: string, time: string}[]>([]); // 予約不可時間
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  maxDate.setHours(0,0,0,0);

  const weekDates = getWeekDates(weekStart);

  // 予約不可情報の取得
  useEffect(() => {
    const fetchUnavailable = async () => {
      const { data: days } = await supabase.from('unavailable_days').select('date');
      setUnavailableDays(days ? days.map(d => d.date) : []);
      const { data: times } = await supabase.from('unavailable_times').select('date, time');
      setUnavailableTimes(times || []);
    };
    fetchUnavailable();
  }, []);

  // 日付クリックで予約可否トグル
  const handleDayClick = async (date: string) => {
    if (!editMode) return;
    if (unavailableDays.includes(date)) {
      // 可にする（削除）
      await supabase.from('unavailable_days').delete().eq('date', date);
      setUnavailableDays(unavailableDays.filter(d => d !== date));
    } else {
      // 不可にする（追加）
      await supabase.from('unavailable_days').insert({ date });
      setUnavailableDays([...unavailableDays, date]);
    }
  };

  // 時間枠クリックで予約可否トグル
  const handleTimeClick = async (date: string, time: string) => {
    if (!editMode) return;
    const exists = unavailableTimes.some(t => t.date === date && t.time === time);
    if (exists) {
      // 可にする（削除）
      await supabase.from('unavailable_times').delete().eq('date', date).eq('time', time);
      setUnavailableTimes(unavailableTimes.filter(t => !(t.date === date && t.time === time)));
    } else {
      // 不可にする（追加）
      await supabase.from('unavailable_times').insert({ date, time });
      setUnavailableTimes([...unavailableTimes, { date, time }]);
    }
  };

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("reservations")
        .select("id, name, menu, start_time, end_time, date")
        .in("date", weekDates);
      if (!error && data) setReservations(data);
      setLoading(false);
    };
    fetchReservations();
  }, [weekStart]);

  const handlePrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };
  const handleNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    if (next <= maxDate) setWeekStart(next);
  };

  function findReservation(date: string, slot: string) {
    return reservations.find(r =>
      r.date === date && getSlotIndex(r.start_time?.slice(0,5)) === getSlotIndex(slot)
    );
  }

  function getColSpan(res: Reservation) {
    const startIdx = getSlotIndex(res.start_time?.slice(0,5));
    const endIdx = getSlotIndex(res.end_time?.slice(0,5));
    return endIdx - startIdx + 1;
  }

  // セルクリック時の処理
  function handleCellClick(date: string, time: string) {
    // そのセルに該当する予約を取得
    const res = reservations.find(r => {
      const start = getSlotIndex(r.start_time?.slice(0,5));
      const end = getSlotIndex(r.end_time?.slice(0,5));
      const idx = timeSlots.indexOf(time);
      return r.date === date && idx >= start && idx < end;
    });
    if (res) setModal({ open: true, reservation: res });
  }

  // 予約一覧再取得関数を定義
  const fetchReservations = async () => {
    setLoading(true);
    const weekDates = getWeekDates(weekStart); // 最新の週の日付を毎回計算
    const { data, error } = await supabase
      .from("reservations")
      .select("id, name, menu, start_time, end_time, date")
      .in("date", weekDates);
    if (!error && data) setReservations(data);
    setLoading(false);
  };

  // 予約削除
  const handleDelete = async () => {
    console.log("handleDelete呼び出し");
    if (modal.reservation && modal.reservation.id) {
      setLoading(true);
      const { error } = await supabase
        .from("reservations")
        .delete()
        .eq("id", modal.reservation.id);
      console.log("削除リクエスト結果", error);
      if (error) {
        alert("削除に失敗しました: " + error.message);
      }
      // 削除後に予約一覧を再取得
      await fetchReservations();
      setLoading(false);
    }
    setModal({ open: false, reservation: null });
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      boxShadow: '0 4px 24px rgba(200,180,160,0.10)',
      padding: 16,
      marginBottom: 24,
      width: '100%',
      overflowX: 'auto'
    }}>
      {/* 編集モードボタンを追加 */}
      <button
        onClick={() => setEditMode(v => !v)}
        style={{
          marginBottom: 16,
          background: editMode ? '#f3b6c2' : '#fff',
          color: editMode ? '#fff' : '#bfae9e',
          border: '1.5px solid #f3b6c2',
          borderRadius: 10,
          padding: '8px 22px',
          fontWeight: 700,
          fontSize: 15,
          cursor: 'pointer'
        }}
      >
        編集モード{editMode ? 'ON' : 'OFF'}
      </button>
      {/* 凡例・案内文 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        margin: '8px 0 12px 0',
        fontSize: 14,
        color: '#bfae9e',
        fontWeight: 500,
        textAlign: 'center',
        lineHeight: 1.5
      }}>
        <div>
          <span style={{fontSize:22, color:'#f3b6c2', marginRight:6}}>○</span>＝空き　
          <span style={{fontSize:22, color:'#ccc', marginRight:6}}>×</span>＝予約済み
        </div>
        <div>
          空き枠をクリックで予約不可/可を切り替えできます
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <button onClick={handlePrevWeek} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'4px 12px', fontWeight:600, cursor:'pointer'}}>前の週</button>
        <span style={{fontWeight:700, color:'#bfae9e', fontSize:16}}>
          {weekDates[0].replace(/-/g,'/')} 〜 {weekDates[6].replace(/-/g,'/')}
        </span>
        <button onClick={handleNextWeek} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'4px 12px', fontWeight:600, cursor:'pointer'}} disabled={weekDates[6] >= maxDate.toISOString().slice(0,10)}>次の週</button>
      </div>
      <div style={{width: '100%', overflowX: 'auto'}}>
        <table style={{minWidth: 800, borderCollapse:'separate', borderSpacing:0, fontSize:13}}>
          <thead>
            <tr>
              <th style={{
                background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:40, position:'sticky', left:0, zIndex:2, borderRight:'1px solid #f3b6c2', padding:'2px 4px'
              }}>時間</th>
              {weekDates.map(date => (
                <th key={date} style={{background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:40, padding:'2px 4px'}}>{date.slice(5).replace('-','/')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, rowIdx) => (
              <tr key={slot}>
                <td style={{
                  background:'#fbeee6', color:'#e7bfa7', fontWeight:600, position:'sticky', left:0, zIndex:1, borderRight:'1px solid #f3b6c2', padding:'2px 4px'
                }}>{slot}</td>
                {weekDates.map((date, colIdx) => {
                  // この時間枠が予約済みか判定
                  const res = reservations.find(r => {
                    const start = getSlotIndex(r.start_time?.slice(0,5));
                    const end = getSlotIndex(r.end_time?.slice(0,5));
                    const idx = rowIdx;
                    return r.date === date && idx >= start && idx < end;
                  });
                  const isUnavailable = unavailableTimes.some(t => t.date === date && t.time === slot);
                  return (
                    <td
                      key={date+slot}
                      style={{
                        border:'1px solid #f3b6c2',
                        minWidth:60,
                        height:32,
                        textAlign:'center',
                        background: isUnavailable ? '#fbeee6' : (res ? '#fbeee6' : '#fff'),
                        color: isUnavailable ? '#e57373' : (res ? '#f3b6c2' : '#bfae9e'),
                        cursor: editMode ? 'pointer' : (res ? 'pointer' : 'default')
                      }}
                      onClick={() => {
                        if (editMode) {
                          handleTimeClick(date, slot);
                        } else if (res) {
                          handleCellClick(date, slot);
                        }
                      }}
                    >
                      {isUnavailable
                        ? <span style={{fontSize:22, fontWeight:700}}>×</span>
                        : (res
                          ? <span style={{color:'#f3b6c2', fontSize:22, fontWeight:700}}>×</span>
                          : <span style={{color:'#bfae9e', fontSize:22}}>○</span>
                        )
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div style={{color:'#bfae9e',marginTop:8}}>読み込み中...</div>}
      {/* モーダル */}
      {modal.open && modal.reservation && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.18)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center'
        }} onClick={()=>{ setModal({open:false,reservation:null}); setEditMode(false); }}>
          <div style={{background:'#fff', borderRadius:16, minWidth:280, maxWidth:360, padding:24, boxShadow:'0 4px 24px rgba(200,180,160,0.18)'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, color:'#a88c7d', fontSize:18, marginBottom:12}}>予約詳細</div>
            {!editMode && modal.reservation ? (
              <>
                <div style={{marginBottom:8, color:'#a88c7d', fontWeight:600}}><b>名前：</b><span style={{color:'#a88c7d', fontWeight:500}}>{modal.reservation.name}</span></div>
                <div style={{marginBottom:8, color:'#a88c7d', fontWeight:600}}><b>メニュー：</b><span style={{color:'#a88c7d', fontWeight:500}}>{modal.reservation.menu}</span></div>
                <div style={{marginBottom:8, color:'#a88c7d', fontWeight:600}}><b>時間：</b><span style={{color:'#a88c7d', fontWeight:500}}>{modal.reservation.start_time?.slice(0,5)}〜{modal.reservation.end_time?.slice(0,5)}</span></div>
                <div style={{marginBottom:8, color:'#a88c7d', fontWeight:600}}><b>日付：</b><span style={{color:'#a88c7d', fontWeight:500}}>{modal.reservation.date}</span></div>
                <button style={{marginTop:12, background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'6px 18px', fontWeight:600, cursor:'pointer', marginRight:8}} onClick={() => {
                  setEditForm({
                    name: modal.reservation?.name || '',
                    menu: modal.reservation?.menu || '',
                    start_time: modal.reservation?.start_time?.slice(0,5) || '',
                    end_time: modal.reservation?.end_time?.slice(0,5) || ''
                  });
                  setEditMode(true);
                }}>編集</button>
                <button style={{marginTop:12, background:'#e7bfa7', color:'#fff', border:'none', borderRadius:8, padding:'6px 18px', fontWeight:600, cursor:'pointer', marginRight:8}} onClick={() => { console.log("削除ボタン押下"); handleDelete(); }}>削除</button>
                <button style={{marginTop:12, background:'#e7bfa7', color:'#fff', border:'none', borderRadius:8, padding:'6px 18px', fontWeight:600, cursor:'pointer'}} onClick={()=>setModal({open:false,reservation:null})}>閉じる</button>
              </>
            ) : editMode && modal.reservation ? (
              <>
                <div style={{marginBottom:8}}>
                  <label style={{color:'#a88c7d', fontWeight:600}}>名前：
                    <input type="text" value={editForm.name} onChange={e=>setEditForm(f=>({...f, name:e.target.value}))} style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'6px 10px', fontSize:15, color:'#a88c7d', marginTop:4}} />
                  </label>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{color:'#a88c7d', fontWeight:600}}>メニュー：
                    <select value={editForm.menu} onChange={e=>setEditForm(f=>({...f, menu:e.target.value}))} style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'6px 10px', fontSize:15, color:'#a88c7d', marginTop:4}}>
                      <option value="デザイン">デザイン</option>
                      <option value="シンプル">シンプル</option>
                    </select>
                  </label>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{color:'#a88c7d', fontWeight:600}}>開始時間：
                    <input type="time" value={editForm.start_time} onChange={e=>setEditForm(f=>({...f, start_time:e.target.value}))} style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'6px 10px', fontSize:15, color:'#a88c7d', marginTop:4}} />
                  </label>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{color:'#a88c7d', fontWeight:600}}>終了時間：
                    <input type="time" value={editForm.end_time} onChange={e=>setEditForm(f=>({...f, end_time:e.target.value}))} style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'6px 10px', fontSize:15, color:'#a88c7d', marginTop:4}} />
                  </label>
                </div>
                <button style={{marginTop:12, background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'6px 18px', fontWeight:600, cursor:'pointer', marginRight:8}} onClick={async()=>{
                  if (!modal.reservation) return;
                  await supabase.from('reservations').update({
                    name: editForm.name,
                    menu: editForm.menu,
                    start_time: editForm.start_time + ':00',
                    end_time: editForm.end_time + ':00'
                  }).eq('id', modal.reservation.id);
                  setEditMode(false);
                  setModal(m => ({...m, reservation: {...(m.reservation as Reservation), ...editForm, start_time: editForm.start_time + ':00', end_time: editForm.end_time + ':00'}}));
                  // 再取得
                  const { data, error } = await supabase
                    .from("reservations")
                    .select("id, name, menu, start_time, end_time, date")
                    .in("date", weekDates);
                  if (!error && data) setReservations(data);
                }}>保存</button>
                <button style={{marginTop:12, background:'#e7bfa7', color:'#fff', border:'none', borderRadius:8, padding:'6px 18px', fontWeight:600, cursor:'pointer'}} onClick={()=>setEditMode(false)}>キャンセル</button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
} 