import React, { useState, useEffect } from 'react';
import { auth, db, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState('');

  // New post form states
  const [dishName, setDishName] = useState('');
  const [description, setDescription] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Listen for posts changes
  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });
    return unsubscribe;
  }, []);

  // Auth functions
  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      setShowAuth(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Post functions
  const handleCreatePost = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let photoURL = '';
      
      // Upload photo if provided
      if (photo) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${photo.name}`);
        const snapshot = await uploadBytes(storageRef, photo);
        photoURL = await getDownloadURL(snapshot.ref);
      }

      // Create post document
      await addDoc(collection(db, 'posts'), {
        dishName,
        description,
        cookTime: parseInt(cookTime),
        photoURL,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userEmail: user.email,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });

      // Reset form
      setDishName('');
      setDescription('');
      setCookTime('');
      setPhoto(null);
      setShowNewPost(false);
      setUploading(false);
    } catch (error) {
      console.error('Error creating post:', error);
      setUploading(false);
      alert('Error creating post. Please try again.');
    }
  };

  const handleLike = async (postId, likes) => {
    if (!user) return;
    
    const postRef = doc(db, 'posts', postId);
    const userLiked = likes?.includes(user.uid);

    try {
      if (userLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading CookShare...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header>
        <nav>
          <div className="logo">CookShare</div>
          <div className="nav-links">
            {user ? (
              <>
                <span className="user-greeting">Hey, {user.displayName || 'Chef'}!</span>
                <button className="btn-primary" onClick={() => setShowNewPost(!showNewPost)}>
                  + New Dish
                </button>
                <button className="btn-secondary" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button className="btn-primary" onClick={() => setShowAuth(true)}>Login / Sign Up</button>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Share Your Culinary Journey</h1>
          <p>Track your cooking adventures, share your creations, and inspire friends with every meal you make.</p>
          {!user && (
            <button className="btn-primary" onClick={() => setShowAuth(true)}>Get Started</button>
          )}
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAuth(false)}>×</button>
            <h2>{isLogin ? 'Welcome Back!' : 'Join CookShare'}</h2>
            <form onSubmit={isLogin ? handleLogin : handleSignUp}>
              {!isLogin && (
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  required
                />
              </div>
              {authError && <p className="error-message">{authError}</p>}
              <button type="submit" className="btn-primary" style={{width: '100%'}}>
                {isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>
            <p className="auth-switch">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => {
                setIsLogin(!isLogin);
                setAuthError('');
              }}>
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container">
        {/* New Post Form */}
        {showNewPost && user && (
          <div className="new-post">
            <h2 className="section-title" style={{textAlign: 'left', marginBottom: '2rem'}}>
              Share Your Latest Creation
            </h2>
            <form onSubmit={handleCreatePost}>
              <div className="form-group">
                <label>Dish Name</label>
                <input
                  type="text"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="e.g., Homemade Margherita Pizza"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your dish... What inspired you? How did it turn out?"
                  required
                />
              </div>
              <div className="form-group">
                <label>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files[0])}
                  style={{display: 'block', padding: '0.5rem 0'}}
                />
              </div>
              <div className="form-group">
                <label>Cooking Time (minutes)</label>
                <input
                  type="number"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  placeholder="e.g., 45"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={uploading} style={{width: '100%'}}>
                {uploading ? 'Uploading...' : 'Share Your Dish'}
              </button>
            </form>
          </div>
        )}

        {/* Feed */}
        <section id="feed">
          <h2 className="section-title">Recent Creations</h2>
          {posts.length === 0 ? (
            <div className="empty-state">
              <h3>No posts yet!</h3>
              <p>Be the first to share a delicious creation.</p>
            </div>
          ) : (
            <div className="feed">
              {posts.map((post) => {
                const userLiked = post.likes?.includes(user?.uid);
                return (
                  <div key={post.id} className="post-card">
                    {post.photoURL ? (
                      <img src={post.photoURL} alt={post.dishName} className="post-image" />
                    ) : (
                      <div className="post-image placeholder"></div>
                    )}
                    <div className="post-content">
                      <div className="post-header">
                        <div className="avatar">{getInitials(post.userDisplayName)}</div>
                        <div className="post-user">
                          <div className="post-user-name">{post.userDisplayName}</div>
                          <div className="post-time">{formatTime(post.createdAt)}</div>
                        </div>
                      </div>
                      <h3 className="post-title">{post.dishName}</h3>
                      <p className="post-description">{post.description}</p>
                      <div className="post-stats">
                        <div className="stat">
                          <span className="stat-icon">⏱️</span>
                          <span>{post.cookTime} mins</span>
                        </div>
                        <div className="stat">
                          <span className="stat-icon">👍</span>
                          <span>{post.likes?.length || 0} likes</span>
                        </div>
                      </div>
                      <div className="post-actions">
                        <button 
                          className={`btn-action ${userLiked ? 'liked' : ''}`}
                          onClick={() => handleLike(post.id, post.likes)}
                          disabled={!user}
                        >
                          {userLiked ? '❤️ Liked' : '👍 Like'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
