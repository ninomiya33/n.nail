import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const timeSlots = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
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

export default function WeekReservationGraph({ onSelect }: { onSelect?: (date: string, time: string) => void }) {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(today));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{date: string, time: string} | null>(null);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  maxDate.setHours(0,0,0,0);

  const weekDates = getWeekDates(weekStart);

  // 週の予約データ取得
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

  // 指定日・時間枠に該当する予約を返す
  function findReservation(date: string, slot: string) {
    return reservations.find(r =>
      r.date === date && getSlotIndex(r.start_time?.slice(0,5)) === getSlotIndex(slot)
    );
  }

  // ピンク棒のcolSpan計算
  function getColSpan(res: Reservation) {
    const startIdx = getSlotIndex(res.start_time?.slice(0,5));
    const endIdx = getSlotIndex(res.end_time?.slice(0,5));
    return endIdx - startIdx + 1;
  }

  // セル選択時の処理
  function handleSelect(date: string, time: string) {
    setSelected({ date, time });
    if (onSelect) onSelect(date, time);
  }

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
      {/* 凡例・案内文 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '8px 0 12px 0',
        fontSize: 14,
        color: '#bfae9e',
        fontWeight: 500,
        justifyContent: 'center'
      }}>
        <span style={{fontSize:22, color:'#f3b6c2', marginRight:6}}>○</span>＝空き　
        <span style={{fontSize:22, color:'#ccc', marginRight:6}}>×</span>＝予約済み　
        空き枠をクリックして予約できます
      </div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <button onClick={handlePrevWeek} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'4px 12px', fontWeight:600, cursor:'pointer'}}>前の週</button>
        <span style={{fontWeight:700, color:'#bfae9e', fontSize:16}}>
          {weekDates[0].replace(/-/g,'/')} 〜 {weekDates[6].replace(/-/g,'/')}
        </span>
        <button onClick={handleNextWeek} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'4px 12px', fontWeight:600, cursor:'pointer'}} disabled={weekDates[6] >= maxDate.toISOString().slice(0,10)}>次の週</button>
      </div>
      <div style={{width: '100%', overflowX: 'auto'}}>
        <table style={{minWidth: 1100, borderCollapse:'separate', borderSpacing:0, fontSize:14}}>
          <thead>
            <tr>
              <th style={{background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:80}}>時間</th>
              {weekDates.map(date => (
                <th key={date} style={{background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:60}}>{date.slice(5).replace('-','/')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, rowIdx) => (
              <tr key={slot}>
                <td style={{background:'#fbeee6', color:'#e7bfa7', fontWeight:600}}>{slot}</td>
                {weekDates.map((date, colIdx) => {
                  // この時間枠が予約済みか判定
                  const isReserved = reservations.some(r => {
                    const start = getSlotIndex(r.start_time?.slice(0,5));
                    const end = getSlotIndex(r.end_time?.slice(0,5));
                    const idx = rowIdx;
                    return r.date === date && idx >= start && idx < end;
                  });
                  const isSelected = selected && selected.date === date && selected.time === slot;
                  return (
                    <td key={date+slot} style={{border:'1px solid #f3b6c2', minWidth:60, height:32, textAlign:'center', background: isSelected ? '#fbeee6' : '#fff'}}>
                      {isReserved ? (
                        <span style={{color:'#ccc', fontSize:22}}>×</span>
                      ) : (
                        <button
                          style={{
                            border:'none', background:'none', fontSize:24, color: isSelected ? '#fff' : '#f3b6c2', cursor:'pointer', borderRadius:'50%', backgroundColor: isSelected ? '#f3b6c2' : 'transparent', width:28, height:28, lineHeight:'28px', fontWeight: isSelected ? 700 : 500, transition:'background 0.2s, color 0.2s'
                          }}
                          onClick={() => handleSelect(date, slot)}
                        >○</button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div style={{color:'#bfae9e',marginTop:8}}>読み込み中...</div>}
    </div>
  );
} 