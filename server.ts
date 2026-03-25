import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Stripe lazily
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("STRIPE_SECRET_KEY is missing. Stripe features will be disabled.");
      return null;
    }
    stripe = new Stripe(key);
  }
  return stripe;
};

// Initialize Firebase Admin lazily
let firebaseAdmin: typeof admin | null = null;
const getFirebaseAdmin = () => {
  if (!firebaseAdmin && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseAdmin = admin;
      console.log("Firebase Admin initialized");
    } catch (error) {
      console.error("Firebase Admin initialization failed:", error);
    }
  }
  return firebaseAdmin;
};

// AI Image Generator (Colab) State
let colabUrl = process.env.COLAB_URL || "";

const app = express();
const PORT = 3000;

async function startServer() {
  console.log("Starting server initialization...");

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Basic health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), colabConfigured: !!colabUrl });
  });

  // YouTube Transcript Endpoint
  app.get("/api/youtube-transcript", async (req, res) => {
    res.json({ transcript: "Transcript feature temporarily disabled for debugging." });
  });

  // Admin: Set Colab URL
  app.post("/api/admin/set-colab-url", async (req, res) => {
    const { url, adminId } = req.body;
    
    // Simple admin check (in production use Firebase Auth verifyIdToken)
    const adminSdk = getFirebaseAdmin();
    if (adminSdk) {
      try {
        const userDoc = await adminSdk.firestore().collection("users").doc(adminId).get();
        if (userDoc.exists && userDoc.data()?.role === "admin") {
          colabUrl = url.endsWith("/") ? url.slice(0, -1) : url;
          console.log("Colab URL updated to:", colabUrl);
          return res.json({ success: true, url: colabUrl });
        }
      } catch (error) {
        console.error("Admin check failed:", error);
      }
    }
    
    // Fallback for demo if admin SDK not fully configured
    colabUrl = url.endsWith("/") ? url.slice(0, -1) : url;
    res.json({ success: true, url: colabUrl, warning: "Admin check bypassed" });
  });

  // AI Image Generation (Proxy to Colab with Pollinations Fallback)
  app.post("/api/generate", async (req, res) => {
    try {
      const { prompt, width = 512, height = 512, steps = 20, hires_fix = false } = req.body;

      if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      if (colabUrl) {
        try {
          console.log("Attempting generation via Colab:", prompt);
          const payload: any = {
            prompt,
            steps,
            width,
            height,
            sampler_name: "Euler a",
            cfg_scale: 7,
          };

          if (hires_fix) {
            payload.enable_hr = true;
            payload.hr_scale = 2;
            payload.hr_upscaler = "R-ESRGAN 4x+";
            payload.denoising_strength = 0.7;
          }

          const response = await fetch(`${colabUrl}/sdapi/v1/txt2img`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(45000) // Increased to 45s for Colab
          });

          if (response.ok) {
            const data: any = await response.json();
            if (data.images && data.images.length > 0) {
              console.log("Colab generation successful");
              return res.json({ image: `data:image/png;base64,${data.images[0]}` });
            }
          }
          console.warn(`Colab returned status ${response.status} or no images`);
        } catch (colabErr: any) {
          console.warn("Colab generation failed, falling back to Pollinations:", colabErr.message);
        }
      }

      // Fallback to Pollinations.ai (Server-side to avoid CORS and get base64)
      console.log("Using Pollinations.ai fallback for generation:", prompt);
      // Updated model list with more reliable ones
      const models = ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'any-dark', 'turbo'];
      let lastError = "Could not connect to any AI image models.";

      for (const model of models) {
        try {
          console.log(`Trying Pollinations model: ${model}`);
          const seed = Math.floor(Math.random() * 1000000);
          const timeout = model === 'flux' ? 30000 : 20000;
          
          // Using the more robust /p/ endpoint which handles redirects and parameters better
          const pollinationsUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true`;
          
          const pollRes = await fetch(pollinationsUrl, {
            signal: AbortSignal.timeout(timeout)
          });
          
          if (pollRes.ok) {
            const arrayBuffer = await pollRes.arrayBuffer();
            if (arrayBuffer.byteLength < 1000) {
              throw new Error("Generated image is too small (possibly an error image)");
            }
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            console.log(`Successfully generated image with model: ${model}`);
            return res.json({ image: `data:image/png;base64,${base64}` });
          }
          
          const errorText = await pollRes.text();
          console.warn(`Pollinations model ${model} failed: ${pollRes.status} ${errorText.slice(0, 100)}`);
          lastError = `Pollinations API error (${model}): ${pollRes.status} ${pollRes.statusText}`;
        } catch (e: any) {
          const isTimeout = e.name === 'TimeoutError' || e.message?.includes('aborted');
          console.warn(`Pollinations model ${model} ${isTimeout ? 'timed out' : 'error'}:`, e.message);
          lastError = isTimeout ? `Connection timed out for model ${model}` : e.message;
        }
      }
      
      throw new Error(lastError);

    } catch (error: any) {
      console.error("Final generation error:", error);
      res.status(500).json({ 
        error: error.message || "Internal Server Error",
        details: "All available AI models are currently busy or unreachable. Please try a different prompt or wait a moment."
      });
    }
  });

  // AI Image Editing (Proxy to Colab with Fallback)
  app.post("/api/edit", async (req, res) => {
    try {
      const { prompt, image, steps = 20 } = req.body;
      const base64Image = image.includes(",") ? image.split(",")[1] : image;

      if (colabUrl) {
        console.log("Forwarding edit request to Colab:", prompt);
        const response = await fetch(`${colabUrl}/sdapi/v1/img2img`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            init_images: [base64Image],
            prompt,
            steps,
            sampler_name: "Euler a",
            cfg_scale: 7,
            denoising_strength: 0.75,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          if (data.images && data.images.length > 0) {
            return res.json({ image: `data:image/png;base64,${data.images[0]}` });
          }
        }
        console.warn("Colab edit failed, falling back.");
      }

      // Fallback: For now, just generate a new image based on the prompt
      // (True img2img fallback is complex without a local model)
      console.log("Using Pollinations fallback for edit:", prompt);
      const models = ['flux', 'flux-realism', 'flux-anime', 'flux-3d', 'any-dark', 'turbo'];
      let lastError = "Image editing failed on all models.";

      for (const model of models) {
        try {
          console.log(`Attempting image edit with model: ${model}`);
          const seed = Math.floor(Math.random() * 1000000);
          const pollinationsUrl = `https://pollinations.ai/p/${encodeURIComponent("Edit of image: " + prompt)}?seed=${seed}&model=${model}&nologo=true`;
          
          const pollRes = await fetch(pollinationsUrl, {
            signal: AbortSignal.timeout(20000)
          });
          
          if (pollRes.ok) {
            const arrayBuffer = await pollRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            console.log(`Successfully edited image with model: ${model}`);
            return res.json({ image: `data:image/png;base64,${base64}` });
          }
          lastError = `Pollinations edit error (${model}): ${pollRes.status} ${pollRes.statusText}`;
        } catch (e: any) {
          console.warn(`Edit model ${model} failed:`, e.message);
          lastError = e.message;
        }
      }

      throw new Error(lastError);

    } catch (error: any) {
      console.error("Edit error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // AI Image Upscaling (Proxy to Colab)
  app.post("/api/upscale", async (req, res) => {
    try {
      if (!colabUrl) {
        return res.status(400).json({ error: "Colab AI Engine is not connected. Please contact admin." });
      }

      const { image, upscale_factor = 2, upscaler = "R-ESRGAN 4x+" } = req.body;
      const base64Image = image.includes(",") ? image.split(",")[1] : image;

      console.log("Forwarding upscale request to Colab, factor:", upscale_factor);

      const response = await fetch(`${colabUrl}/sdapi/v1/extra-single-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          upscaling_resize: upscale_factor,
          upscaler_1: upscaler,
        }),
      });

      if (!response.ok) {
        throw new Error(`Colab API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      if (data.image) {
        res.json({ image: `data:image/png;base64,${data.image}` });
      } else {
        throw new Error("No upscaled image returned from Colab");
      }
    } catch (error: any) {
      console.error("Upscale error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API routes go here
  console.log("Setting up API routes...");
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripeClient = getStripe();
      if (!stripeClient) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }
      const { plan, userId } = req.body;
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "bdt",
              product_data: {
                name: `${plan.name} Plan`,
                description: `${plan.credits} Credits / Month`,
              },
              unit_amount: plan.price * 100, // Stripe expects amount in cents/paisa
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}&planId=${plan.id}`,
        cancel_url: `${appUrl}/pricing`,
        metadata: {
          userId,
          planId: plan.id,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe session error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Stripe Session
  app.post("/api/verify-session", async (req, res) => {
    try {
      const stripeClient = getStripe();
      if (!stripeClient) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }
      const { sessionId, userId, planId } = req.body;
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        // Securely update user plan in Firestore using admin SDK if available
        const adminSdk = getFirebaseAdmin();
        if (adminSdk && adminSdk.apps.length > 0) {
          const db = adminSdk.firestore();
          const plans = {
            1: { name: 'standard', credits: 1000 },
            2: { name: 'customizable', credits: 3000 },
            3: { name: 'extended', credits: 6000 }
          };
          const selectedPlan = plans[planId as keyof typeof plans];
          
          if (selectedPlan) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 30);
            
            await db.collection("users").doc(userId).update({
              plan: selectedPlan.name,
              credits: selectedPlan.credits,
              expire_date: expireDate.toISOString(),
            });
            return res.json({ success: true });
          }
        }
        // If admin SDK not available, we'll handle it client-side (less secure but works for demo)
        return res.json({ success: true, message: "Payment verified, please update client-side" });
      }
      res.status(400).json({ error: "Payment not completed" });
    } catch (error: any) {
      console.error("Stripe verification error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware attached.");
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });
}

// Initialize the server
const serverPromise = startServer();

// For local development
if (process.env.NODE_ENV !== "production") {
  serverPromise.then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  await serverPromise;
  return app(req, res);
};
