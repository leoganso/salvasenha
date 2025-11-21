import express from "express";
import cors from "cors";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Upload de imagem (semente)
const upload = multer({ storage: multer.memoryStorage() });

/* ============================================
   LOGIN
=============================================== */
app.post("/login", async (req, res) => {
  const { user, password } = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", user)
    .eq("password", password)
    .maybeSingle();

  if (!data) return res.status(401).json({ error: "Usuário inválido" });

  res.json({ user: data.username, role: data.role });
});

/* ============================================
   CLIENTES
=============================================== */
app.get("/clients", async (req, res) => {
  const { data } = await supabase.from("clients").select("*");
  res.json(data);
});

app.post("/clients", async (req, res) => {
  const { name, value, phone } = req.body;

  const { error } = await supabase.from("clients").insert([
    { name, value, phone }
  ]);

  if (error) return res.status(400).json({ error });
  res.json({ success: true });
});

app.delete("/clients/:id", async (req, res) => {
  const { id } = req.params;
  await supabase.from("clients").delete().eq("id", id);
  res.json({ success: true });
});

/* ============================================
   LICENÇAS
=============================================== */
app.get("/licenses", async (req, res) => {
  const { data } = await supabase.from("licenses").select("*");
  res.json(data);
});

app.post("/licenses", upload.single("image"), async (req, res) => {
  const { client, seed, license, value } = req.body;

  let image_url = null;
  if (req.file) {
    const { data } = await supabase.storage
      .from("seeds")
      .upload(`seed_${Date.now()}.jpg`, req.file.buffer, {
        contentType: "image/jpeg"
      });

    if (data)
      image_url = supabase.storage.from("seeds").getPublicUrl(data.path).data
        .publicUrl;
  }

  await supabase.from("licenses").insert([
    {
      client,
      seed,
      license,
      value,
      image: image_url,
      created_at: new Date().toISOString()
    }
  ]);

  res.json({ success: true });
});

/* ============================================
   PAGAMENTO
=============================================== */
app.post("/payment", async (req, res) => {
  const { id, status } = req.body;

  await supabase
    .from("licenses")
    .update({ payment: status })
    .eq("id", id);

  res.json({ success: true });
});

/* ============================================
   USUÁRIOS
=============================================== */
app.get("/users", async (req, res) => {
  const { data } = await supabase.from("users").select("*");
  res.json(data);
});

app.post("/users", async (req, res) => {
  const { username, password, role } = req.body;

  await supabase.from("users").insert([{ username, password, role }]);

  res.json({ success: true });
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  await supabase.from("users").delete().eq("id", id);
  res.json({ success: true });
});

/* ============================================
   BUSCAR CLIENTE
=============================================== */
app.get("/search", async (req, res) => {
  const q = req.query.q;

  const { data } = await supabase
    .from("licenses")
    .select("*")
    .ilike("client", `%${q}%`);

  res.json(data);
});

/* ============================================
   START SERVER
=============================================== */
app.listen(process.env.PORT || 3000, () => {
  console.log("API rodando...");
});
