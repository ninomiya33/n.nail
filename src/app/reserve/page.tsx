"use client";
import React, { useState } from "react";
import Link from "next/link";
import styles from "./reserve.module.css";
import { supabase } from "../supabaseClient";
import WeekReservationGraph from "./WeekReservationGraph";

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(0, 0, 0, h, m);
  date.setMinutes(date.getMinutes() + minutes);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ReservePage() {
  const [form, setForm] = useState({
    date: "",
    time: "",
    menu: "",
    name: "",
    contact: "",
    memo: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    if (!form.time || !form.name || !form.date || !form.menu) {
      setError("必須項目を入力してください");
      setLoading(false);
      return;
    }
    // メニューに応じて所要時間を決定
    let duration = 120; // デフォルト2時間
    if (form.menu === "デザイン") duration = 150; // 2時間30分
    const endTime = addMinutesToTime(form.time, duration);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) {
      setError("ログインしてください");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("reservations").insert({
      staff_id: null,
      user_id: userData.user.id,
      name: form.name,
      menu: form.menu,
      start_time: form.time + ":00",
      end_time: endTime + ":00",
      date: form.date
    });
    if (error) {
      setError("送信に失敗しました");
    } else {
      setSuccess(true);
      setForm({ date: "", time: "", menu: "", name: "", contact: "", memo: "" });
    }
    setLoading(false);
  };

  return (
    <main className={styles.container}>
      <WeekReservationGraph />
      <div className={styles.logoArea}>
        <span className={styles.logoN}>N</span>
        <span className={styles.logoDot}>.</span>
        <span className={styles.logoNail}>nail</span>
      </div>
      <h1 className={styles.title}>ご予約フォーム</h1>
      {success && <div style={{color:'#e7bfa7',marginBottom:8}}>送信が完了しました！</div>}
      {error && <div style={{color:'#e57373',marginBottom:8}}>{error}</div>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>
          日付
          <input type="date" className={styles.input} name="date" value={form.date} onChange={handleChange} required />
        </label>
        <label className={styles.label}>
          メニュー
          <select className={styles.input} name="menu" value={form.menu} onChange={handleChange} required>
            <option value="">選択してください</option>
            <option value="デザイン">デザイン</option>
            <option value="シンプル">シンプル</option>
          </select>
        </label>
        <label className={styles.label}>
          時間
          <select className={styles.input} name="time" value={form.time} onChange={handleChange} required>
            <option value="">選択してください</option>
            <option value="10:00">10:00</option>
            <option value="11:00">11:00</option>
            <option value="12:00">12:00</option>
            <option value="13:00">13:00</option>
            <option value="14:00">14:00</option>
            <option value="15:00">15:00</option>
            <option value="16:00">16:00</option>
            <option value="17:00">17:00</option>
          </select>
        </label>
        <label className={styles.label}>
          お名前
          <input type="text" className={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="例：山田花子" required />
        </label>
        <label className={styles.label}>
          連絡先（電話番号またはメール）
          <input type="text" className={styles.input} name="contact" value={form.contact} onChange={handleChange} placeholder="例：090-1234-5678" />
        </label>
        <label className={styles.label}>
          ご要望・メモ（任意）
          <textarea className={styles.textarea} name="memo" value={form.memo} onChange={handleChange} placeholder="デザインの希望やご質問など"></textarea>
        </label>
        <button type="submit" className={styles.reserveBtn} disabled={loading}>{loading ? "送信中..." : "予約内容を送信"}</button>
      </form>
      <Link href="/" className={styles.backBtn}>トップに戻る</Link>
    </main>
  );
} 