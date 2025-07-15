"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./gallery.module.css";
import GalleryPostForm from "./GalleryPostForm";
import { supabase } from "../supabaseClient";

type GalleryPost = {
  id: string;
  user_id: string;
  image_url: string;
  description: string;
  tags: string[];
  posted_by: string;
  created_at: string;
  likes?: number;
};
type GalleryComment = {
  id: string;
  post_id: string;
  user_id: string;
  posted_by: string;
  comment: string;
  created_at: string;
};

export default function GalleryPage() {
  const [modal, setModal] = useState<{open: boolean, image: GalleryPost|null}>({open: false, image: null});
  const [showForm, setShowForm] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<GalleryComment[]>([]);
  const [posts, setPosts] = useState<GalleryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInitial, setUserInitial] = useState('U');

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gallery_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setPosts(data);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      setUserInitial(email ? email[0].toUpperCase() : 'U');
    };
    fetchUser();
  }, []);

  // いいね数・コメント取得
  useEffect(() => {
    const fetchComments = async () => {
      if (!modal.image) return;
      const { data, error } = await supabase
        .from("gallery_comments")
        .select("*")
        .eq("post_id", modal.image.id)
        .order("created_at", { ascending: true });
      if (!error && data) setComments(data);
    };
    if (modal.open && modal.image) {
      setLikeCount(modal.image.likes ?? 0);
      fetchComments();
    }
  }, [modal.open, modal.image]);

  // いいね処理
  const handleLike = async () => {
    if (!modal.image) return;
    const newLiked = !liked;
    setLiked(newLiked);
    const newCount = likeCount + (newLiked ? 1 : -1);
    setLikeCount(newCount);
    // DB反映
    await supabase.from("gallery_posts").update({ likes: newCount }).eq("id", modal.image.id);
    // モーダル内のimage.likesも更新
    setModal(m => m.image ? { ...m, image: { ...m.image, likes: newCount } } : m);
  };

  // コメント送信
  const handleCommentSend = async () => {
    if (!comment.trim() || !modal.image) return;
    // ユーザー情報取得
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id || null;
    const posted_by = userData?.user?.email || "匿名";
    // insert
    await supabase.from("gallery_comments").insert({
      post_id: modal.image.id,
      user_id,
      posted_by,
      comment
    });
    setComment("");
    // 再fetch
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("*")
      .eq("post_id", modal.image.id)
      .order("created_at", { ascending: true });
    if (!error && data) setComments(data);
  };

  // 相対時間表示関数
  function formatRelativeTime(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}秒前`;
    if (diff < 3600) return `${Math.floor(diff/60)}分前`;
    if (diff < 86400) return `${Math.floor(diff/3600)}時間前`;
    return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDate()}`;
  }

  return (
    <main className={styles.container}>
      <div className={styles.logoArea}>
        <span className={styles.logoN}>N</span>
        <span className={styles.logoDot}>.</span>
        <span className={styles.logoNail}>nail</span>
      </div>
      <h1 className={styles.title}>ネイルデザインギャラリー</h1>
      {loading ? (
        <div style={{color:'#bfae9e', textAlign:'center', margin:'32px 0'}}>読み込み中...</div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 440,
          margin: '0 auto',
          padding: '0 0 24px 0',
          overflowY: 'auto'
        }}>
          {posts.map((img, i) => {
            console.log('image_url:', img.image_url);
            const baseUrl = "https://gqdzlktdsqirupzobwgo.supabase.co/storage/v1/object/public/images/";
            const src = (img.image_url && img.image_url.startsWith("http")) ? img.image_url : baseUrl + img.image_url;
            return (
              <div
                className={styles.imageCard}
                key={img.id || i}
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  boxShadow: '0 4px 16px rgba(200,180,160,0.13)',
                  padding: '0 0 0 0',
                  margin: '0 0 28px 0',
                  width: '100%',
                  maxWidth: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  transition: 'box-shadow 0.2s',
                  border: '1.5px solid #fbeee6',
                  cursor: 'pointer',
                }}
                onClick={()=>setModal({open:true, image:img})}
              >
                <img
                  src={src}
                  alt={img.description || 'ギャラリー画像'}
                  style={{
                    width: '100%',
                    height: '240px',
                    objectFit: 'cover',
                    borderRadius: '16px 16px 0 0',
                    boxShadow: '0 2px 8px rgba(243,182,194,0.10)',
                    background: '#fbeee6',
                    display: 'block',
                  }}
                  onError={e => { e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'; }}
                />
                {/* インスタ風下部 */}
                <div style={{width:'100%', padding:'14px 18px 12px 18px', boxSizing:'border-box', display:'flex', flexDirection:'column', alignItems:'flex-start', borderRadius:'0 0 18px 18px'}}>
                  {/* アイコン行 */}
                  <div style={{display:'flex', alignItems:'center', gap:18, marginBottom:8}}>
                    <span style={{fontSize:22, color:'#bfae9e', marginRight:2}}>♡</span>
                    <span style={{fontSize:20, color:'#bfae9e'}}>💬</span>
                  </div>
                  {/* いいね数 */}
                  <div style={{fontWeight:600, color:'#a88c7d', fontSize:14, marginBottom:6}}>いいね！ {img.likes ?? 0}件</div>
                  {/* 投稿者名＋説明文 */}
                  <div style={{marginBottom:6}}>
                    <span style={{fontWeight:700, color:'#bfae9e', marginRight:6}}>{img.posted_by || "Nail.nail"}</span>
                    <span style={{color:'#a88c7d', fontSize:14}}>{img.description}</span>
                  </div>
                  {/* タグ */}
                  <div style={{marginBottom:6, color:'#a88c7d', fontSize:13}}>
                    {(img.tags || []).map((tag:string, j:number) => (
                      <span key={j} style={{background:'#fbeee6', color:'#e7bfa7', borderRadius:8, padding:'2px 8px', marginRight:6}}># {tag}</span>
                    ))}
                  </div>
                  {/* 投稿日 */}
                  <div style={{color:'#bfae9e', fontSize:12}}>{img.created_at?.slice(0,10)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{textAlign:'center', margin:'18px 0'}}>
        <button onClick={()=>setShowForm(f=>!f)} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:10, padding:'12px 32px', fontWeight:700, fontSize:16, cursor:'pointer', boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}>
          {showForm ? "投稿フォームを閉じる" : "投稿する"}
        </button>
      </div>
      {showForm && <GalleryPostForm />}
      <div className={styles.linkGroup}>
        <Link href="/" className={styles.linkBtn}>トップに戻る</Link>
        <Link href="/reserve" className={styles.linkBtn}>予約する</Link>
      </div>
      {/* 詳細モーダル */}
      {modal.open && modal.image && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.18)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center'
        }} onClick={() => {
          setModal({open:false, image:null});
          setLiked(false); setLikeCount(0); setComments([]); setComment("");
        }}>
          <div style={{background:'#fff', borderRadius:16, minWidth:280, maxWidth:400, padding:0, boxShadow:'0 4px 24px rgba(200,180,160,0.18)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', alignItems:'stretch'}} onClick={e=>e.stopPropagation()}>
            {/* 上部画像 */}
            <div style={{width:'100%', background:'#eee'}}>
              <img src={modal.image.image_url} alt={modal.image.description} style={{width:'100%', maxHeight:340, objectFit:'cover', display:'block'}} />
            </div>
            {/* アイコン・いいね・説明など */}
            <div style={{padding:'16px 18px 12px 18px'}}>
              {/* アイコン行 */}
              <div style={{display:'flex', alignItems:'center', gap:18, marginBottom:8}}>
                <span style={{fontSize:24, color:liked ? '#e57373' : '#bfae9e', cursor:'pointer'}} onClick={handleLike}>♡</span>
                <span style={{fontSize:22, color:'#bfae9e', cursor:'pointer'}} onClick={()=>{document.getElementById('commentInput')?.focus();}}>💬</span>
                <span style={{fontSize:22, color:'#bfae9e', cursor:'pointer'}}>⤴️</span>
              </div>
              {/* いいね数 */}
              <div style={{fontWeight:600, color:'#a88c7d', fontSize:14, marginBottom:6}}>いいね！ {likeCount}件</div>
              {/* 投稿者名＋説明文 */}
              <div style={{marginBottom:6}}>
                <span style={{fontWeight:700, color:'#bfae9e', marginRight:6}}>{modal.image.posted_by || "Nail.nail"}</span>
                <span style={{color:'#a88c7d', fontSize:14}}>{modal.image.description}</span>
              </div>
              {/* タグ */}
              <div style={{marginBottom:6, color:'#a88c7d', fontSize:13}}>
                {(modal.image.tags || []).map((tag:string, i:number) => (
                  <span key={i} style={{background:'#fbeee6', color:'#e7bfa7', borderRadius:8, padding:'2px 8px', marginRight:6}}># {tag}</span>
                ))}
              </div>
              {/* 投稿日 */}
              <div style={{color:'#bfae9e', fontSize:12, marginBottom:8}}>{modal.image.created_at?.slice(0,10)}</div>
            </div>
            {/* インスタ風コメント欄（モーダル内で画像の下に表示、スクロール可） */}
            <div style={{
              background: '#fff',
              borderRadius: '0 0 0 0',
              boxShadow: 'none',
              padding: '0 0 0 0',
              position: 'static',
              maxHeight: 220,
              overflowY: 'auto',
              margin: '0 18px 8px 18px',
              flex: '1 1 auto'
            }}>
              <div style={{textAlign: 'center', fontWeight: 700, color: '#a88c7d', fontSize: 18, margin: '8px 0 8px 0', letterSpacing: '0.05em'}}>コメント</div>
              {comments.map(c => (
                <div key={c.id} style={{display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0'}}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#fbeee6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#bfae9e', fontSize: 18
                  }}>
                    {c.posted_by?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div style={{flex: 1}}>
                    <span style={{fontWeight: 700, color: '#a88c7d', marginRight: 6}}>{c.posted_by || 'ユーザー'}</span>
                    <span style={{color: '#bfae9e', fontSize: 12, marginLeft: 4}}>{formatRelativeTime(c.created_at)}</span>
                    <div style={{color: '#a88c7d', fontSize: 15, margin: '2px 0 0 0'}}>{c.comment}</div>
                    <div style={{color: '#bfae9e', fontSize: 13, marginTop: 2, cursor: 'pointer'}}>返信</div>
                  </div>
                  <span style={{fontSize: 18, color: '#e7bfa7', cursor: 'pointer', marginLeft: 8}}>♡</span>
                </div>
              ))}
            </div>
            {/* 入力欄 */}
            <div style={{
              display: 'flex', alignItems: 'center', borderTop: '1.5px solid #f3b6c2',
              padding: '10px 18px', background: '#fff', position: 'static', bottom: 0, zIndex: 10
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#fbeee6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#bfae9e', fontSize: 16, marginRight: 8
              }}>
                {userInitial}
              </div>
              <input id="commentInput" type="text" value={comment} onChange={e=>setComment(e.target.value)} placeholder="コメントを入力..." style={{flex:1, padding:'6px 8px', borderRadius:8, border:'1.5px solid #f3b6c2', marginRight:6, fontSize:14, color:'#a88c7d'}} />
              <button onClick={handleCommentSend} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', fontWeight:600, fontSize:14, cursor:'pointer'}}>送信</button>
            </div>
            {/* 閉じるボタン */}
            <button style={{margin:'12px 18px 18px 18px', background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'10px 0', fontWeight:600, cursor:'pointer', width:'calc(100% - 36px)'}} onClick={() => {
              setModal({open:false, image:null});
              setLiked(false); setLikeCount(0); setComments([]); setComment("");
            }}>閉じる</button>
          </div>
        </div>
      )}
    </main>
  );
} 