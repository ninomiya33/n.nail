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

export default function WeekReservationGraph({ onSelect }: { onSelect?: (date: string, time: string) => void }) {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(today));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{date: string, time: string} | null>(null);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  maxDate.setHours(0,0,0,0);

  const weekDates = getWeekDates(weekStart);
  const [unavailableDays, setUnavailableDays] = useState<string[]>([]); // 予約不可日
  const [unavailableTimes, setUnavailableTimes] = useState<{date: string, time: string}[]>([]); // 予約不可時間

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

  // 週の予約データ取得
  useEffect(() => {
    const fetchReservations = async () => {
      const weekDates = getWeekDates(weekStart);
      const { data, error } = await supabase
        .from("reservations")
        .select("id, name, menu, start_time, end_time, date, user_id")
        .in("date", weekDates);
      console.log("取得した予約データ", data, error);
      if (!error && data) setReservations(data);
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
          空き枠をクリックして予約できます
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
                  const isReserved = reservations.some(r => {
                    const start = getSlotIndex(r.start_time?.slice(0,5));
                    const end = getSlotIndex(r.end_time?.slice(0,5));
                    const idx = rowIdx;
                    return r.date === date && idx >= start && idx < end;
                  });
                  const isUnavailable = unavailableDays.includes(date) || unavailableTimes.some(t => t.date === date && t.time === slot);
                  const isSelected = selected && selected.date === date && selected.time === slot;
                  return (
                    <td
                      key={date+slot}
                      style={{
                        border:'1px solid #f3b6c2',
                        minWidth:60,
                        height:32,
                        textAlign:'center',
                        background: (isReserved || isUnavailable) ? '#fbeee6' : (isSelected ? '#fbeee6' : '#fff'),
                        color: (isReserved || isUnavailable) ? '#ccc' : (isSelected ? '#fff' : '#bfae9e'),
                        cursor: (isReserved || isUnavailable) ? 'not-allowed' : 'pointer'
                      }}
                      onClick={() => {
                        if (!(isReserved || isUnavailable)) {
                          handleSelect(date, slot);
                        }
                      }}
                    >
                      {(isReserved || isUnavailable)
                        ? <span style={{fontSize:22, fontWeight:700}}>×</span>
                        : <span style={{color:'#bfae9e', fontSize:22}}>○</span>
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
    </div>
  );
} 