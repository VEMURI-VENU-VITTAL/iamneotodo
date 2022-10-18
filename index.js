if(process.env.NODE_ENV!=="production"){
  require('dotenv').config();
}


const express=require("express");
const app=express();
const ejsMate=require("ejs-mate");
const path=require('path');
const methodOverride=require("method-override");
const mongoose=require("mongoose");
const axios=require('axios')
const User=require('./models/user');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const Auth=require('./models/authentication')
const session=require('express-session')
const flash=require('connect-flash');
const {isLoggedIn}=require('./middleware');
const multer=require('multer');
const {storage}=require('./cloudinary/app');
const upload=multer({storage})
const cloudinary=require('cloudinary').v2;
const streamifier=require('streamifier');
const ExpressError=require("./utils/ExpressError")
const catchAsync=require("./utils/catchAsync")
const helmet=require('helmet');
const user = require('./models/user');


const MongoDBStore=require("connect-mongo")(session);


//process.env.DB_URL || 
//process.env.SECRET ||

const dbUrl= process.env.DB_URL || 'mongodb://localhost:27017/todo';
const secret= process.env.SECRET || 'thisshouldbeabettersecret';


main().catch(err => console.log(err));
async function main() {
    await mongoose.connect(dbUrl)
    .then(()=>{
      console.log("connection open");
      useNewUrlParser:true;
      useCreateIndex:true;
      useUnifiedTopology:true;
      useFindAndModify:false;
      
    })
    .catch(err=>{
      console.log("oh no error!!");
      console.log(err);
    })
  
    console.log("connected");
    
    // use `await mongoose.connect('mongodb://user:password@localhost:27017/test');` if your database has auth enabled
  }



app.use('/public',express.static('public'))

app.set('views',path.join(__dirname,'views'));
app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}))

const store = new MongoDBStore({
  url:dbUrl,
  secret,
  touchAfter:24*60*60

})

store.on("error",function(e){
  console.log('session store', e);
})

const sessionConfig={
    store,
    name:'session',
    secret,
    resave:false,
    saveUninitialized:true,
    cookie:{
      httpOnly:true,
      express:Date.now()+1000*60*60*24*7,
      maxAge:1000*60*60*24*7
    }
  }

  

app.use(session(sessionConfig))
app.use(flash())
app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(Auth.authenticate()));
passport.serializeUser(Auth.serializeUser());
passport.deserializeUser(Auth.deserializeUser());

app.use(methodOverride('_method'));

app.use((req,res,next)=>{
    res.locals.currentUser=req.user;
    res.locals.success=req.flash("success");
    res.locals.error=req.flash('error');
    next();
})


  app.get('/todo',isLoggedIn,async (req,res)=>{
    const user=await User.find({author:req.user._id});
    res.render('home.ejs',{user});
  })

  app.post('/todo', async(req,res)=>{
    const {fname}=req.body;
    const user=await new User({fname:fname,author:req.user._id});
    await user.save();
    res.redirect("/todo");
  })

  app.post('/todo/search',async (req,res)=>{
    
    const {search}=req.body;
    const user=await User.find({fname:search, author:req.user._id});
    res.render('search.ejs', {user});
  })

  app.post('/todo/:id', async(req,res)=>{
    const {work}=req.body;
    const {id}=req.params;
    const user=await User.findById(id);
    user.work.push(work);
    await user.save();
    
    res.redirect('/todo');
  })

  app.delete('/todo/:id',async(req,res)=>{
    const {id}=req.params;
    await user.findByIdAndDelete(id);
    res.redirect('/todo');
  })

  app.post('/todo/:id/image',upload.array('image'), async (req,res)=>{
    const {id}=req.params;
    const user=await User.findById(id);
    //console.log(req.files);
    for(let i=0;i<req.files.length;i++){
        const ne={
            url:req.files[i].path,
            filename:req.files[i].filename
        }
        user.image.push(ne);
    }
    //console.log(user);
    await user.save();
    res.redirect('/todo');
  })

  app.get('/todo/:id/edit',async (req,res)=>{
    const {id}=req.params;
    const user=await User.findById(id);
    res.render('edit.ejs', {user});
  })

  app.put('/todo/:id/edit', upload.array('image'), async (req,res)=>{
    const {id}=req.params;
    let {fname, work}=req.body;
    //console.log(work)
    try{
      work.forEach(a=>{
        const nwork=[]
      for(let i=0;i<work.length;i++){
        if(work[i]!=''){
          nwork.push(work[i]);
        }
      }
      work=nwork;
      })
    }
    catch{
      
    }
    
    const user=await User.findById(id);
    user.work=work;
    user.fname=fname;
    if(req.files.length!=0){
      const ne={
        url:req.files[0].path,
        fname:req.files[0].filename,
      }
      user.image.push(ne);
    }
    
    console.log(user);
    await user.save();

    res.redirect('/todo');

  })

  app.delete('/todo/:id/:num/dimg',async (req,res)=>{
    const {id,num}=req.params;
    const user=await User.findById(id);
    if(user.image.length==1){
      user.image=[];
    }
    else{
      user.image.pop(num);
    }
    await user.save();
    console.log(user);
    res.redirect('/todo');

  })
  
  app.get('/todo/:id/show',async (req,res)=>{
    const {id}=req.params;
    const user=await User.findById(id);
    res.render('show.ejs', {user});
  })

  app.delete('/todo/:id/:num/work',async (req,res)=>{
    const {id, num}=req.params;
    const user=await User.findById(id);
    user.work.pop(num);
    await user.save();
    res.redirect('/todo')
  })

  
  
  app.get('/register',(req,res)=>{
    res.render('register.ejs')
  })

  app.post('/register',async (req,res)=>{
    try{
    const {email,username,password}=req.body;
    const auth=await new Auth({email,username});
    const registeredUser=await Auth.register(auth,password);
    req.login(registeredUser, err=>{
        if(err) return next(err);
        req.flash('success','successfully logged in!!')
        res.redirect('/todo');
    })
    }
    catch(e){
        req.flash('error',e.message)
        res.redirect('/todo');
    }
  })

  app.get('/login',(req,res)=>{
    res.render('login.ejs');
  })

  app.post('/login',passport.authenticate('local',{failureFlash:true, failureRedirect:'/login'}),(req,res)=>{
    req.flash('success','welcome back');
    const redirectUrl=req.session.returnTo || '/todo';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
  })

  app.get('/logout',(req,res)=>{
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success','logged out successfully');
        res.redirect('/todo');
      });
    
  })

  app.all('*',(req,res,next)=>{
    next(new ExpressError('page not found',404))
  })
  
  app.use((err,req,res,next)=>{
    const {statusCode=500,message="something went wrong"}=err;
    res.status(statusCode).render('error.ejs',{err});
  })

  const port=process.env.PORT || 3000;
  app.listen(port, ()=>{
    console.log(`serving on port ${port}!`);
})