import React, { useState } from "react";

export type GalleryPost = {
  id: string;
  user_id: string;
  image_url: string;
  description: string;
  tags: string[];
  posted_by: string;
  created_at: string;
  likes?: number;
};

type Props = {
  posts: GalleryPost[];
  loading?: boolean;
  adminMode?: boolean;
  onDelete?: (id: string) => void;
};

export default function GalleryList({ posts, loading, adminMode, onDelete }: Props) {
  const [modal, setModal] = useState<{open: boolean, post: GalleryPost|null}>({open: false, post: null});

  return (
    <div style={{width:'100%', maxWidth:440, margin:'0 auto', padding:'0 0 24px 0', overflowY:'auto'}}>
      {loading ? (
        <div style={{color:'#bfae9e', textAlign:'center', margin:'32px 0'}}>読み込み中...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%'}}>
          {posts.map((img, i) => {
            const baseUrl = "https://gqdzlktdsqirupzobwgo.supabase.co/storage/v1/object/public/images/";
            const src = (img.image_url && img.image_url.startsWith("http")) ? img.image_url : baseUrl + img.image_url;
            return (
              <div key={img.id || i} style={{background:'#fff', borderRadius:'18px', boxShadow:'0 4px 16px rgba(200,180,160,0.13)', padding:'0 0 0 0', margin:'0 0 28px 0', width:'100%', maxWidth:400, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', transition:'box-shadow 0.2s', border:'1.5px solid #fbeee6', position:'relative', cursor:'pointer'}}
                onClick={()=>setModal({open:true, post:img})}
              >
                <img src={src} alt={img.description || 'ギャラリー画像'} style={{width:'100%', height:'240px', objectFit:'cover', borderRadius:'16px 16px 0 0', boxShadow:'0 2px 8px rgba(243,182,194,0.10)', background:'#fbeee6', display:'block'}} onError={e => { e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                <div style={{width:'100%', padding:'14px 18px 12px 18px', boxSizing:'border-box', display:'flex', flexDirection:'column', alignItems:'flex-start', borderRadius:'0 0 18px 18px'}}>
                  <div style={{fontWeight:700, color:'#bfae9e', marginBottom:6}}>{img.posted_by || "Nail.nail"}</div>
                  <div style={{color:'#a88c7d', fontSize:14, marginBottom:6}}>{img.description}</div>
                  <div style={{marginBottom:6, color:'#a88c7d', fontSize:13}}>
                    {(img.tags || []).map((tag:string, j:number) => (
                      <span key={j} style={{background:'#fbeee6', color:'#e7bfa7', borderRadius:8, padding:'2px 8px', marginRight:6}}># {tag}</span>
                    ))}
                  </div>
                  <div style={{color:'#bfae9e', fontSize:12}}>{img.created_at?.slice(0,10)}</div>
                  {/* 管理者モードならカード下部にも削除ボタンを常時表示 */}
                  {adminMode && onDelete && (
                    <button
                      style={{
                        marginTop: 12,
                        background: '#fff0f6',
                        color: '#e07fa7',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 16px',
                        fontWeight: 600,
                        fontSize: 14,
                        boxShadow: '0 1px 4px #fbeee6',
                        cursor: 'pointer',
                        alignSelf: 'flex-end',
                        transition: 'background 0.2s',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        onDelete(img.id);
                      }}
                    >削除</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* 詳細モーダル */}
      {modal.open && modal.post && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.18)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center'
        }} onClick={()=>setModal({open:false, post:null})}>
          <div style={{background:'#fff', borderRadius:16, minWidth:280, maxWidth:400, padding:0, boxShadow:'0 4px 24px rgba(200,180,160,0.18)', overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', alignItems:'stretch'}} onClick={e=>e.stopPropagation()}>
            {/* 上部画像 */}
            <div style={{width:'100%', background:'#eee'}}>
              <img src={modal.post.image_url} alt={modal.post.description} style={{width:'100%', maxHeight:340, objectFit:'cover', display:'block'}} />
            </div>
            {/* アイコン・いいね・説明など（トップページと統一） */}
            <div style={{padding:'16px 18px 12px 18px'}}>
              {/* アイコン行 */}
              <div style={{display:'flex', alignItems:'center', gap:18, marginBottom:8}}>
                <span style={{fontSize:24, color:'#bfae9e'}}>♡</span>
                <span style={{fontSize:22, color:'#bfae9e'}}>💬</span>
                <span style={{fontSize:22, color:'#bfae9e'}}>⤴️</span>
              </div>
              {/* いいね数 */}
              <div style={{fontWeight:600, color:'#a88c7d', fontSize:14, marginBottom:6}}>いいね！ {modal.post.likes ?? 0}件</div>
              {/* 投稿者名＋説明文 */}
              <div style={{marginBottom:6}}>
                <span style={{fontWeight:700, color:'#bfae9e', marginRight:6}}>{modal.post.posted_by || "Nail.nail"}</span>
                <span style={{color:'#a88c7d', fontSize:14}}>{modal.post.description}</span>
              </div>
              {/* タグ */}
              <div style={{marginBottom:6, color:'#a88c7d', fontSize:13}}>
                {(modal.post.tags || []).map((tag:string, i:number) => (
                  <span key={i} style={{background:'#fbeee6', color:'#e7bfa7', borderRadius:8, padding:'2px 8px', marginRight:6}}># {tag}</span>
                ))}
              </div>
              {/* 投稿日 */}
              <div style={{color:'#bfae9e', fontSize:12, marginBottom:8}}>{modal.post.created_at?.slice(0,10)}</div>
              {/* 管理者モードなら削除ボタン */}
              {adminMode && onDelete && (
                <button onClick={()=>onDelete(modal.post!.id)} style={{marginTop:18, background:'#e57373', color:'#fff', border:'none', borderRadius:8, padding:'8px 22px', fontWeight:600, cursor:'pointer', alignSelf:'flex-end'}}>削除</button>
              )}
            </div>
            {/* コメント欄（ダミー） */}
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
              <div style={{color:'#bfae9e', fontSize:14, textAlign:'center', margin:'12px 0'}}>（管理画面ではコメント機能は閲覧のみ・または未実装です）</div>
            </div>
            {/* 入力欄（管理画面では非表示） */}
            {/* 閉じるボタン */}
            <button style={{margin:'12px 18px 18px 18px', background:'#f3b6c2', color:'#fff', border:'none', borderRadius:8, padding:'10px 0', fontWeight:600, cursor:'pointer', width:'calc(100% - 36px)'}} onClick={() => setModal({open:false, post:null})}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
} 