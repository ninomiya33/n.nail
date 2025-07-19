"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ChangeEvent } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Customer {
  id: string;
  name: string;
  contact_info: string | null;
  created_at: string;
  image_url?: string; // 画像URLを追加
}

// 顧客詳細のダミーデータ型
interface CustomerHistory {
  nail_image_url: string;
  materials_used: string;
  conversation_notes: string;
  date: string;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newMaterials, setNewMaterials] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    nail_image_url: "",
    materials_used: "",
    conversation_notes: "",
    date: ""
  });
  const [historyImageUrl, setHistoryImageUrl] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);

  // 画像選択時のプレビュー
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setNewImageUrl(URL.createObjectURL(file));
    }
  };

  // 画像アップロード＆顧客追加
  const handleAddCustomer = async () => {
    if (!newName) return;
    setAdding(true);
    let imageUrl = "";
    // 画像アップロード
    if (newImage) {
      const fileExt = newImage.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('customer-images').upload(fileName, newImage);
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('customer-images').getPublicUrl(data.path);
        imageUrl = publicUrlData.publicUrl;
      }
    }
    // 1. 顧客追加
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert({
        name: newName,
        contact_info: newContact,
        image_url: imageUrl || null
      })
      .select()
      .single();
    if (customerError || !customerData) {
      alert("顧客の追加に失敗しました");
      setAdding(false);
      return;
    }
    // 2. 履歴追加
    const { error: historyError } = await supabase
      .from('customer_histories')
      .insert({
        customer_id: customerData.id,
        date: new Date().toISOString().slice(0, 10), // 施術日: 今日の日付
        nail_image_url: imageUrl || null,
        materials_used: newMaterials,
        conversation_notes: newMemo
      });
    if (historyError) {
      alert("履歴の追加に失敗しました");
      setAdding(false);
      return;
    }
    // 追加後リスト再取得
    const { data: newList, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, contact_info, created_at, image_url")
      .order("created_at", { ascending: false });
    if (!fetchError && newList) setCustomers(newList);
    setNewName("");
    setNewContact("");
    setNewImage(null);
    setNewImageUrl(null);
    setNewMaterials("");
    setNewMemo("");
    setAdding(false);
  };

  // 画像選択時のプレビュー
  const handleHistoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHistoryImageUrl(URL.createObjectURL(file));
    }
  };

  // 顧客削除機能
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('この顧客を削除しますか？関連する履歴もすべて削除されます。')) {
      return;
    }
    
    setDeletingCustomer(customerId);
    
    try {
      // 1. 関連する履歴を削除
      const { error: historyError } = await supabase
        .from('customer_histories')
        .delete()
        .eq('customer_id', customerId);
      
      if (historyError) {
        alert('履歴の削除に失敗しました');
        setDeletingCustomer(null);
        return;
      }
      
      // 2. 顧客を削除
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (customerError) {
        alert('顧客の削除に失敗しました');
        setDeletingCustomer(null);
        return;
      }
      
      // 3. リストを更新
      setCustomers(customers.filter(c => c.id !== customerId));
      alert('顧客を削除しました');
      
    } catch (error) {
      alert('削除中にエラーが発生しました');
    } finally {
      setDeletingCustomer(null);
    }
  };

  // ダミー顧客データ
  const dummyCustomer: Customer = {
    id: "dummy-id",
    name: "山田 花子",
    contact_info: "090-1234-5678",
    created_at: "2024-06-01T00:00:00Z"
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, contact_info, created_at, image_url")
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setCustomers(data || []);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  // 顧客履歴を取得するuseEffect
  useEffect(() => {
    if (!selectedCustomer) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('customer_histories')
        .select('nail_image_url, materials_used, conversation_notes, date')
        .eq('customer_id', selectedCustomer.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();
      if (data) setHistory(data);
      else setHistory(null);
    };
    fetchHistory();
  }, [selectedCustomer]);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  // 顧客詳細画面
  if (selectedCustomer) {
    const displayHistory = history || {
      nail_image_url: "/nail-logo.png",
      materials_used: "",
      conversation_notes: "",
      date: ""
    };
    return (
      <div style={{marginTop: 24}}>
        <button
          onClick={() => setSelectedCustomer(null)}
          style={{background:'#fff', color:'#f3b6c2', border:'1.5px solid #f3b6c2', borderRadius:10, padding:'8px 22px', fontWeight:700, fontSize:15, cursor:'pointer', marginBottom:18, boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}
        >← 一覧に戻る</button>
        
        {/* 統一された顧客詳細カード */}
        <div style={{
          background:'#fff', 
          borderRadius:24, 
          boxShadow:'0 8px 32px rgba(200,180,160,0.15)', 
          padding:'32px 24px', 
          maxWidth:420, 
          margin:'0 auto',
          border:'1px solid rgba(243,182,194,0.1)'
        }}>
          {/* 顧客情報ヘッダー */}
          <div style={{textAlign:'center', marginBottom:28, paddingBottom:20, borderBottom:'2px solid #fef7f4'}}>
            <div style={{fontWeight:700, color:'#a88c7d', fontSize:24, marginBottom:6}}>{selectedCustomer.name}</div>
            {selectedCustomer.contact_info && <div style={{color:'#e7bfa7', fontSize:16, marginBottom:8}}>（{selectedCustomer.contact_info}）</div>}
            <div style={{color:'#a88c7d', fontWeight:600, fontSize:14, background:'#fef7f4', padding:'6px 16px', borderRadius:20, display:'inline-block'}}>前回施術日: {displayHistory.date}</div>
          </div>

          {/* メイン画像 */}
          <div style={{
            display:'flex', 
            justifyContent:'center', 
            alignItems:'center', 
            marginBottom:28,
            width:'100%'
          }}>
            <img 
              src={displayHistory.nail_image_url} 
              alt="前回ネイル" 
              style={{
                width:'100%', 
                maxWidth:300,
                height:300, 
                borderRadius:20, 
                objectFit:'cover', 
                background:'#fff', 
                border:'3px solid #f3b6c2',
                boxShadow:'0 8px 24px rgba(243,182,194,0.25)'
              }} 
            />
          </div>

          {/* 使った材料 */}
          <div style={{marginBottom:24}}>
            <div style={{color:'#e7bfa7', fontWeight:700, fontSize:16, marginBottom:12, display:'flex', alignItems:'center'}}>
              <span style={{background:'#f3b6c2', width:4, height:16, borderRadius:2, marginRight:8}}></span>
              使った材料
            </div>
            <div style={{
              background:'#fef7f4', 
              borderRadius:16, 
              padding:'16px 18px', 
              border:'1.5px solid rgba(243,182,194,0.3)',
              color:'#a88c7d',
              fontSize:15,
              lineHeight:1.6
            }}>
              {displayHistory.materials_used || '記録なし'}
            </div>
          </div>

          {/* 会話メモ */}
          <div style={{marginBottom:28}}>
            <div style={{color:'#e7bfa7', fontWeight:700, fontSize:16, marginBottom:12, display:'flex', alignItems:'center'}}>
              <span style={{background:'#f3b6c2', width:4, height:16, borderRadius:2, marginRight:8}}></span>
              会話メモ
            </div>
            <div style={{
              background:'#fef7f4', 
              borderRadius:16, 
              padding:'18px 20px', 
              border:'1.5px solid rgba(243,182,194,0.3)',
              color:'#a88c7d',
              fontSize:15,
              lineHeight:1.7,
              minHeight:100
            }}>
              {displayHistory.conversation_notes || '記録なし'}
            </div>
          </div>

          {/* 編集ボタン */}
          <button onClick={()=>{
            setEditMode(true);
            setHistoryForm(displayHistory);
            setHistoryImageUrl(displayHistory.nail_image_url);
          }} style={{
            background:'linear-gradient(135deg, #f3b6c2 0%, #e7bfa7 100%)', 
            color:'#fff', 
            border:'none', 
            borderRadius:16, 
            padding:'16px 0', 
            fontWeight:700, 
            fontSize:17, 
            cursor:'pointer', 
            width:'100%',
            boxShadow:'0 6px 20px rgba(243,182,194,0.35)',
            transition:'all 0.3s ease',
            transform:'translateY(0)'
          }}>履歴を編集</button>
        </div>
        {/* 編集フォーム */}
        {editMode && (
          <div style={{background:'#fff', borderRadius:18, boxShadow:'0 2px 8px rgba(200,180,160,0.10)', padding:'24px 18px', maxWidth:420, margin:'32px auto 0 auto'}}>
            <div style={{fontWeight:700, color:'#bfae9e', fontSize:18, marginBottom:16}}>施術履歴を編集</div>
            <div style={{display:'flex', flexDirection:'column', gap:14}}>
              <div>
                <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>施術日</div>
                <input type="date" value={historyForm.date} onChange={e=>setHistoryForm(f=>({...f, date:e.target.value}))} style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d'}} />
              </div>
              <div>
                <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>画像</div>
                <label style={{display:'block', border:'2px dashed #f3b6c2', borderRadius:10, padding:'18px 0', textAlign:'center', color:'#f3b6c2', cursor:'pointer', marginBottom:8}}>
                  <span style={{fontSize:28, fontWeight:700}}>＋</span><br />
                  <span style={{fontSize:14}}>画像をクリックして選択</span>
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={handleHistoryImageChange} />
                </label>
                {historyImageUrl && (
                  <img src={historyImageUrl} alt="プレビュー" style={{width:72, height:72, borderRadius:12, objectFit:'cover', border:'1.5px solid #f3b6c2', margin:'0 auto'}} />
                )}
              </div>
              <div>
                <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>使った材料</div>
                <input type="text" value={historyForm.materials_used} onChange={e=>setHistoryForm(f=>({...f, materials_used:e.target.value}))} placeholder="例: ピンクジェル, ラメ, ストーン" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d'}} />
              </div>
              <div>
                <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>会話メモ</div>
                <textarea value={historyForm.conversation_notes} onChange={e=>setHistoryForm(f=>({...f, conversation_notes:e.target.value}))} placeholder="例: 春らしいデザインをご希望。仕事で使いやすい色味を提案。" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d', minHeight:60}} />
              </div>
              <button onClick={()=>{
                setHistory({
                  nail_image_url: historyImageUrl || "/nail-logo.png",
                  materials_used: historyForm.materials_used,
                  conversation_notes: historyForm.conversation_notes,
                  date: historyForm.date
                });
                setEditMode(false);
              }} style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:10, padding:'12px 0', fontWeight:700, fontSize:17, cursor:'pointer', marginTop:8, boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}>保存</button>
              <button onClick={()=>setEditMode(false)} style={{background:'#e7bfa7', color:'#fff', border:'none', borderRadius:10, padding:'12px 0', fontWeight:700, fontSize:17, cursor:'pointer', marginTop:8, boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}>キャンセル</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 顧客一覧画面
  const displayCustomers = customers.length === 0 ? [dummyCustomer] : customers;
  const filteredCustomers = displayCustomers.filter(c =>
    c.name.includes(search) || (c.contact_info || "").includes(search)
  );
  return (
    <div style={{marginTop: 24}}>
      {/* 顧客追加フォーム */}
      <div style={{background:'#fff', borderRadius:18, boxShadow:'0 2px 8px rgba(200,180,160,0.10)', padding:'24px 18px', maxWidth:420, margin:'0 auto 32px auto'}}>
        <div style={{fontWeight:700, color:'#bfae9e', fontSize:18, marginBottom:16}}>顧客追加</div>
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div>
            <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>名前 <span style={{color:'#e57373'}}>*</span></div>
            <input type="text" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="例: 山田 花子" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d'}} />
          </div>
          <div>
            <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>連絡先</div>
            <input type="text" value={newContact} onChange={e=>setNewContact(e.target.value)} placeholder="例: 090-1234-5678" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d'}} />
          </div>
          <div>
            <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>使った材料</div>
            <input type="text" value={newMaterials} onChange={e=>setNewMaterials(e.target.value)} placeholder="例: ピンクジェル, ラメ, ストーン" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d'}} />
          </div>
          <div>
            <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>会話のメモ</div>
            <textarea value={newMemo} onChange={e=>setNewMemo(e.target.value)} placeholder="例: 春らしいデザインをご希望。仕事で使いやすい色味を提案。" style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d', minHeight:60}} />
          </div>
          <div>
            <div style={{color:'#a88c7d', fontWeight:600, marginBottom:4}}>画像</div>
            <label style={{display:'block', border:'2px dashed #f3b6c2', borderRadius:10, padding:'18px 0', textAlign:'center', color:'#f3b6c2', cursor:'pointer', marginBottom:8}}>
              <span style={{fontSize:28, fontWeight:700}}>＋</span><br />
              <span style={{fontSize:14}}>画像をクリックして選択</span>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handleImageChange} />
            </label>
            {newImageUrl && (
              <img src={newImageUrl} alt="プレビュー" style={{width:72, height:72, borderRadius:12, objectFit:'cover', border:'1.5px solid #f3b6c2', margin:'0 auto'}} />
            )}
          </div>
          <button
            onClick={handleAddCustomer}
            disabled={!newName || adding}
            style={{background:'#f3b6c2', color:'#fff', border:'none', borderRadius:10, padding:'12px 0', fontWeight:700, fontSize:17, cursor:!newName||adding?'not-allowed':'pointer', marginTop:8, boxShadow:'0 2px 8px rgba(243,182,194,0.10)'}}
          >{adding ? '追加中...' : '追加する'}</button>
        </div>
      </div>
      {/* 検索ボックス */}
      <div style={{maxWidth:420, margin:'0 auto 18px auto'}}>
        <input
          type="text"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="名前や連絡先で検索"
          style={{width:'100%', borderRadius:8, border:'1.5px solid #f3b6c2', padding:'8px 12px', fontSize:16, color:'#a88c7d', marginBottom:4}}
        />
      </div>
      {/* 顧客一覧（高さ固定・スクロール可能） */}
      <div style={{maxWidth:420, margin:'0 auto', height:350, overflowY:'auto', display:'flex', flexDirection:'column', gap:20, borderRadius:16, background:'#fbeee6', padding:'16px 0'}}>
        {filteredCustomers.length === 0 && <div style={{textAlign:'center', color:'#bfae9e'}}>該当する顧客がいません</div>}
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            style={{
              background:'#fff',
              borderRadius:18,
              boxShadow:'0 2px 8px rgba(200,180,160,0.10)',
              padding:'20px 18px',
              border: '1.5px solid #fbeee6',
              transition:'border 0.2s',
            }}
          >
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div 
                style={{display:'flex', alignItems:'center', gap:12, flex:1, cursor:'pointer', minWidth:0}}
                onClick={() => setSelectedCustomer(customer)}
              >
                {/* 顧客画像 */}
                {('image_url' in customer) && (customer as Customer & { image_url?: string }).image_url && (
                  <img src={(customer as Customer & { image_url?: string }).image_url} alt="顧客画像" style={{width:40, height:40, borderRadius:10, objectFit:'cover', border:'1.5px solid #f3b6c2', flexShrink:0}} />
                )}
                <div style={{display:'flex', flexDirection:'column', gap:2, minWidth:0, flex:1}}>
                  <span style={{fontWeight:700, color:'#a88c7d', fontSize:18, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{customer.name}</span>
                  {customer.contact_info && <span style={{color:'#e7bfa7', fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>（{customer.contact_info}）</span>}
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
                <span style={{color:'#f3b6c2', fontWeight:600, fontSize:16}}>詳細を見る →</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCustomer(customer.id);
                  }}
                  disabled={deletingCustomer === customer.id}
                  style={{
                    background: deletingCustomer === customer.id ? '#e7bfa7' : '#ff6b6b',
                    color:'#fff',
                    border:'none',
                    borderRadius:8,
                    padding:'6px 12px',
                    fontSize:12,
                    fontWeight:600,
                    cursor: deletingCustomer === customer.id ? 'not-allowed' : 'pointer',
                    transition:'all 0.2s',
                    marginLeft:8,
                    flexShrink:0
                  }}
                >
                  {deletingCustomer === customer.id ? '削除中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 