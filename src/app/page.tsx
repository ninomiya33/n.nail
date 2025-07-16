import React from "react";
import Link from "next/link";
import styles from "./top.module.css";

export default function Home() {
  return (
    <main className={styles.container}>
      <div className={styles.logoArea}>
        <div className={styles.logoText}>
          <span className={styles.logoN}>N</span>
          <span className={styles.logoDot}>.</span>
          <span className={styles.logoNail}>nail</span>
        </div>
        <div className={styles.logoSub}>Nail Salon</div>
      </div>
      <div className={styles.introCard}>
        <img src="/nail-logo.png" alt="Nail Salon ロゴ" style={{width: 180, maxWidth: '90%', height: 'auto', display: 'block', margin: '0 auto'}} />
      </div>
      <div className={styles.buttonGroup}>
        <Link href="/reserve" className={styles.reserveBtn}>予約する</Link>
        <Link href="/gallery" className={styles.galleryBtn}>ギャラリーを見る</Link>
      </div>
    </main>
  );
}
