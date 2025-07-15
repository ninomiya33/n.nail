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

export default function WeekReservationGraph() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(today));
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
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
        <span style={{
          display: 'inline-block',
          width: 32,
          height: 12,
          background: '#f3b6c2',
          borderRadius: 6,
          marginRight: 6,
          verticalAlign: 'middle'
        }}></span>
        ＝予約済み　／　空白セルを選んで予約できます
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
              <th style={{background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:80}}>日付</th>
              {timeSlots.map(slot => (
                <th key={slot} style={{background:'#fbeee6', color:'#bfae9e', fontWeight:600, minWidth:60}}>{slot}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDates.map((date, rowIdx) => {
              let skip = 0;
              return (
                <tr key={date}>
                  <td style={{background:'#fbeee6', color:'#e7bfa7', fontWeight:600}}>{date.slice(5).replace('-','/')}</td>
                  {timeSlots.map((slot, colIdx) => {
                    if (skip > 0) { skip--; return null; }
                    const res = findReservation(date, slot);
                    if (res) {
                      const colSpan = getColSpan(res);
                      skip = colSpan - 1;
                      return (
                        <td key={slot} colSpan={colSpan} style={{padding:0, border:'1px solid #f3b6c2', position:'relative'}}>
                          <div style={{
                            background:'#f3b6c2',
                            borderRadius:14,
                            height:28,
                            margin:'2px auto',
                            width:'90%',
                            position:'relative',
                            left:0, right:0,
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontWeight:600,
                            fontSize:15,
                            color:'#fff'
                          }}>
                            <span style={{fontSize:13}}>{res.start_time?.slice(0,5)}〜{res.end_time?.slice(0,5)}</span>
                          </div>
                        </td>
                      );
                    }
                    return <td key={slot} style={{border:'1px solid #f3b6c2', minWidth:60, height:32, background:'#fff'}}></td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <div style={{color:'#bfae9e',marginTop:8}}>読み込み中...</div>}
    </div>
  );
} 