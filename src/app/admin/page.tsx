"use client";
import React, { useState, useEffect } from "react";
import styles from "./admin.module.css";
import { supabase } from "../supabaseClient";
import AdminWeekReservationGraph from "./AdminWeekReservationGraph";
import GalleryPostForm from "../gallery/GalleryPostForm";

const timeSlots = [
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00"
];
const menuList = ["デザイン", "シンプル"];

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

function getSlotIndex(time: string) {
  return timeSlots.indexOf(time);
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [modal, setModal] = useState<ModalState>({ open: false, menu: "", slot: "", reservation: null });
  const [form, setForm] = useState({ name: "", start_time: "", end_time: "" });
  const [loading, setLoading] = useState(false);

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

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>予約管理</h1>
      <AdminWeekReservationGraph />
      {/* ギャラリー投稿フォームを下部に追加 */}
      <div style={{marginTop: 40, width: '100%', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto'}}>
        <GalleryPostForm />
      </div>
    </main>
  );
} 