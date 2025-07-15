"use client";
import React, { useRef, useState } from "react";
import { supabase } from "../supabaseClient";

export default function GalleryPostForm() {
  const [image, setImage] = useState<File|null>(null);
  const [preview, setPreview] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!image) { setError("画像を選択してください"); return; }
    setLoading(true);
    try {
      // 1. ログインユーザー取得
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("ログインしてください");
      const user_id = userData.user.id;
      const posted_by = userData.user.email || "";
      // 2. 画像アップロード
      const fileExt = image.name.split('.').pop();
      const fileName = `${user_id}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("images").upload(fileName, image, { upsert: false });
      if (uploadError) throw uploadError;
      // 3. 画像の公開URL取得
      const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(fileName);
      const image_url = publicUrlData.publicUrl;
      // 4. DBにinsert
      const { error: insertError } = await supabase.from("gallery_posts").insert({
        user_id,
        image_url,
        description: desc,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        posted_by
      });
      if (insertError) throw insertError;
      alert("投稿が完了しました！");
      setImage(null); setPreview(""); setDesc(""); setTags("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "投稿に失敗しました");
      } else {
        setError("投稿に失敗しました");
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{background:'#fff', borderRadius:16, boxShadow:'0 2px 12px rgba(200,180,160,0.10)', padding:24, maxWidth:380, margin:'0 auto 28px auto', display:'flex', flexDirection:'column', gap:18}}>
      <div style={{fontWeight:700, color:'#bfae9e', fontSize:18, marginBottom:4}}>ギャラリー投稿</div>
      {error && <div style={{color:'#e57373', fontWeight:600, marginBottom:4}}>{error}</div>}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          border:'2px dashed #f3b6c2', borderRadius:14, padding:'18px 0', marginBottom:8,
          background:'#fff8f3', cursor:'pointer', position:'relative', minHeight: preview ? 0 : 120
        }}
        onClick={handleClickUpload}
      >
        <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} style={{display:'none'}} />
        {preview ? (
          <img src={preview} alt="preview" style={{width:'90%', borderRadius:12, objectFit:'cover', maxHeight:180}} />
        ) : (
          <>
            <span style={{fontSize:32, color:'#f3b6c2', marginBottom:8}}>＋</span>
            <span style={{color:'#bfae9e', fontWeight:600, fontSize:15}}>画像をドラッグまたはクリックして選択</span>
          </>
        )}
      </label>
      <label style={{color:'#a88c7d', fontWeight:600}}>説明文
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="デザインの説明やこだわりなど" style={{width:'100%', borderRadius:8, padding:10, fontSize:15, marginTop:6, border:'1.5px solid #f3b6c2', color:'#a88c7d', minHeight:60}} />
      </label>
      <label style={{color:'#a88c7d', fontWeight:600}}>タグ（カンマ区切り）
        <input type="text" value={tags} onChange={e=>setTags(e.target.value)} placeholder="例: シンプル,ピンク,春" style={{width:'100%', borderRadius:8, padding:10, fontSize:15, marginTop:6, border:'1.5px solid #f3b6c2', color:'#a88c7d'}} />
      </label>
      <button type="submit" disabled={loading} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:10, padding:'12px 0', fontWeight:700, fontSize:16, marginTop:8, cursor:'pointer', opacity:loading?0.6:1}}>{loading ? "投稿中..." : "投稿する"}</button>
    </form>
  );
} 