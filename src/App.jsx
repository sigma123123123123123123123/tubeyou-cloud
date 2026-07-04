import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "./supabaseClient";
import './App.css';
import { 
  Menu, Search, Home, FolderHeart, User, LogOut, Upload, X, PlusCircle,
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, Edit3, CheckCircle,
  RotateCcw, RotateCw, Subtitles, Languages, Tv2, ThumbsUp, Send, Video, Image, Settings
} from 'lucide-react';

// CENTRALIZED TARGET BASE PIPELINE - Swap to your online production domain when live
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://tubeyou-qkpy.onrender.com";  fetch(`${API_URL}/api/users/signup`);
  
function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videosFeed, setVideosFeed] = useState([]);
  
  // Account Information Core Matrices
  const [userEmail, setUserEmail] = useState(localStorage.getItem('tubeyou_user') || '');
  const [myProfile, setMyProfile] = useState(null);
  const [myRecentVideos, setMyRecentVideos] = useState([]);
  const [publicChannelData, setPublicChannelData] = useState(null);

  // Profile Modification Bindings
  const [editName, setEditName] = useState('');
  const [avatarUpload, setAvatarUpload] = useState(null);
  const [newChannelHandle, setNewChannelHandle] = useState('');

  // Auth Inputs
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Enhanced File Upload Interface States
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const [searchString, setSearchString] = useState('');
  const [videoComments, setVideoComments] = useState([]);
  const [typedComment, setTypedComment] = useState('');
  const [hasLiked, setHasLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // HTML5 Media Player Engine Binding
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Subtitle & Multi-Resolution State Machines
  const [showCaptions, setShowCaptions] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const [videoSubtitles, setVideoSubtitles] = useState([]); 
  const [selectedQuality, setSelectedQuality] = useState('1080p60');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Address Bar Location Interceptor
  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newPath, videoObj = null) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
    setSelectedVideo(videoObj);
    setAuthError('');
    setIsPlaying(false);
    setVideoSubtitles([]);
    setCaptionText('');
  };

  useEffect(() => {
    if (!userEmail && path !== '/login' && path !== '/signup') {
      navigateTo('/signup');
    } else if (userEmail && (path === '/login' || path === '/signup')) {
      navigateTo('/home');
    }
  }, [path, userEmail]);

  // REAL DYNAMIC BACKEND SUBTITLE PIPELINE
  useEffect(() => {
    const fetchLiveSubtitles = async () => {
      if (!selectedVideo?.id || !showCaptions) return;
      try {
        const res = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/subtitles`);
        if (res.ok) {
          setVideoSubtitles(await res.json());
        }
      } catch (err) { console.error("Subtitle data sync breakdown:", err); }
    };
    fetchLiveSubtitles();
  }, [selectedVideo?.id, showCaptions]);

  // RUNTIME TIMELINE AUDIO-TO-TEXT MATCH ENGINE
  useEffect(() => {
    if (!showCaptions || !isPlaying || videoSubtitles.length === 0) {
      setCaptionText('');
      return;
    }
    const currentLine = videoSubtitles.find(line => currentTime >= line.start && currentTime < line.end);
    setCaptionText(currentLine ? currentLine.text : '');
  }, [currentTime, showCaptions, isPlaying, videoSubtitles]);

  // CORE DATA ROUTERS
  const loadVideosFromDatabase = async (queryText = '') => {
    try {
      const url = queryText ? `${API_BASE}/api/videos?q=${encodeURIComponent(queryText)}` : `${API_BASE}/api/videos`;
      const res = await fetch(url);
      setVideosFeed(await res.json());
    } catch (err) { console.error(err); }
  };

  const loadSubscriptionFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/videos/subscriptions?email=${userEmail}`);
      setVideosFeed(await res.json());
    } catch (err) { console.error(err); }
  };

  const syncAccountData = async () => {
    if (!userEmail) return;
    try {
      const res = await fetch(`${API_BASE}/api/account?email=${userEmail}`);
      if (res.ok) {
        const data = await res.json();
        setMyProfile(data.profile);
        setEditName(data.profile.account_name);
        setMyRecentVideos(data.videos);
      }
    } catch (err) {}
  };

  const syncPublicChannel = async (channelHandle) => {
    try {
      const res = await fetch(`${API_BASE}/api/channel/${channelHandle}`);
      if (res.ok) {
        setPublicChannelData(await res.json());
      } else {
        setPublicChannelData({ error: "Channel not found." });
      }
    } catch { setPublicChannelData({ error: "Network connection refused." }); }
  };

  // EVALUATE ROUTING ACTIONS RUNTIME
  useEffect(() => {
    if (!userEmail) return;
    if (path === '/home') loadVideosFromDatabase();
    else if (path === '/subscriptions') loadSubscriptionFeed();
    else if (path === '/account') syncAccountData();
    else if (path.includes('/channel/@')) {
      const handle = path.split('/channel/@')[1];
      syncPublicChannel(handle);
    }
  }, [path, userEmail]);

  // DETAILED WATCH PANEL CONTEXT RETRIEVAL
  useEffect(() => {
    const fetchVideoInteractions = async () => {
      if (!path.startsWith('/watch') || !selectedVideo?.id || !userEmail) return;
      try {
        const resCom = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/comments`);
        setVideoComments(await resCom.json());
        const resLike = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/like_status?email=${userEmail}`);
        setHasLiked((await resLike.json()).is_liked);
        const resSub = await fetch(`${API_BASE}/api/subscriptions/status?subscriber=${userEmail}&channel=${selectedVideo.uploader_email}`);
        setIsSubscribed((await resSub.json()).is_subscribed);
      } catch (err) {}
    };
    fetchVideoInteractions();
  }, [path, selectedVideo?.id, userEmail]);

  const handleVideoClick = async (video) => {
    try { await fetch(`${API_BASE}/api/videos/${video.id}/view`, { method: 'POST' }); } catch {}
    navigateTo(`/watch?v=${video.id}`, { ...video, views: (video.views || 0) + 1 });
  };

  // PROFILE ACTIONS MANAGEMENT
  const saveProfileUpdates = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', userEmail);
    formData.append('account_name', editName);
    if (avatarUpload) formData.append('avatar_file', avatarUpload);

    try {
      // FIXED: Swapped trailing double quote to backtick
      const res = await fetch(`${API_BASE}/api/account/update`, { method: 'POST', body: formData });
      if (res.ok) { alert("Profile saved successfully."); syncAccountData(); setAvatarUpload(null); }
    } catch {}
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', userEmail);
    formData.append('channel_name', newChannelHandle);
    try {
      const res = await fetch(`${API_BASE}/api/account/create_channel`, { method: 'POST', body: formData });
      if (res.ok) { syncAccountData(); } else { alert((await res.json()).detail); }
    } catch {}
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadTitle || !selectedFile) return setUploadStatus("Supply video and title.");
    setUploadStatus("Uploading assets into production pipeline...");

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('uploader', userEmail);
    formData.append('video_file', selectedFile);
    if (selectedThumbnail) formData.append('thumbnail_file', selectedThumbnail);

    try {
      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        setUploadStatus("Published successfully!"); setUploadTitle(''); setSelectedFile(null); setSelectedThumbnail(null); setIsUploadOpen(false); loadVideosFromDatabase();
      } else {
        const data = await res.json();
        setUploadStatus(data.detail || "Server processing rejected upload.");
      }
    } catch { setUploadStatus("Network stream connection fault occurred."); }
  };

  // Media Control Handlers
  const togglePlay = () => { if (!videoRef.current) return; isPlaying ? videoRef.current.pause() : videoRef.current.play(); setIsPlaying(!isPlaying); };
  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleScrubChange = (e) => { if (videoRef.current) { const nt = parseFloat(e.target.value); videoRef.current.currentTime = nt; setCurrentTime(nt); } };
  const handleVolumeChange = (e) => { const nv = parseFloat(e.target.value); setVolume(nv); if (videoRef.current) { videoRef.current.volume = nv; videoRef.current.muted = nv === 0; } setIsMuted(nv === 0); };
  const toggleMute = () => { if (!videoRef.current) return; const nm = !isMuted; setIsMuted(nm); videoRef.current.muted = nm; };
  const toggleFullscreen = () => { if (!playerContainerRef.current) return; !document.fullscreenElement ? playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)) : document.exitFullscreen().then(() => setIsFullscreen(false)); };
  const handleTimeSkip = (s) => { if (!videoRef.current) return; videoRef.current.currentTime += s; };

  const changeResolutionQuality = (targetRes) => {
    if (!videoRef.current) return;
    const cacheTime = videoRef.current.currentTime;
    const wasPlaying = isPlaying;
    
    setSelectedQuality(targetRes);
    setShowQualityMenu(false);
    
    setTimeout(() => {
      videoRef.current.currentTime = cacheTime;
      if (wasPlaying) videoRef.current.play();
    }, 50);
  };

  const handleLikeInteraction = async () => {
    const formData = new FormData(); formData.append('user_email', userEmail);
    const res = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/like`, { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json(); setSelectedVideo({ ...selectedVideo, likes: data.likes }); setHasLiked(data.is_liked);
    }
  };

  const handleSubscribeToggle = async (targetChannelEmail) => {
    const formData = new FormData(); formData.append('subscriber', userEmail); formData.append('channel', targetChannelEmail);
    const res = await fetch(`${API_BASE}/api/subscribe`, { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json(); setIsSubscribed(data.is_subscribed);
      if (path.includes('/channel/@')) syncPublicChannel(publicChannelData.profile.channel_name);
    } else { alert((await res.json()).detail); }
  };

  const handleCommentSubmission = async (e) => {
    e.preventDefault(); if (!typedComment.trim()) return;
    const formData = new FormData(); formData.append('user_email', userEmail); formData.append('comment_text', typedComment);
    const res = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/comments`, { method: 'POST', body: formData });
    if (res.ok) { setTypedComment(''); const rc = await fetch(`${API_BASE}/api/videos/${selectedVideo.id}/comments`); setVideoComments(await rc.json()); }
  };

  const handleAuthSubmit = async (e, isSignupAttempt) => {
    e.preventDefault(); setAuthError('');
    const endpoint = isSignupAttempt ? "/api/signup" : "/api/login";
    const formData = new FormData(); formData.append('email', emailInput); formData.append('password', passwordInput);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: formData });
      if (res.ok) { localStorage.setItem('tubeyou_user', emailInput); setUserEmail(emailInput); navigateTo('/home'); }
      else setAuthError((await res.json()).detail || "Authentication processing failed.");
    } catch { setAuthError("Connection refused."); }
  };

  const renderQualityLabel = (qKey) => {
    if (qKey.endsWith('60')) return `${qKey.replace('60', '')} (60fps)`;
    if (qKey.endsWith('30')) return `${qKey.replace('30', '')} (30fps)`;
    return qKey;
  };

  return (
    <div className="app-container">
      {/* GLOBAL APPLICATION NAVBAR */}
      <header className="navbar">
        <div className="nav-section">
          <Menu style={{ cursor: 'pointer' }} />
          <div className="logo" onClick={() => { setSearchString(''); navigateTo('/home'); }}>TubeYou<span>.com</span></div>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); loadVideosFromDatabase(searchString); navigateTo('/home'); }} className="search-bar">
          <input type="text" placeholder="Search platform content..." value={searchString} onChange={(e) => setSearchString(e.target.value)} />
          <button type="submit" className="search-btn"><Search size={18} /></button>
        </form>

        <div className="nav-section">
          {userEmail ? (
            <div className="user-profile-zone">
              <button className="upload-trigger-btn design-plus" onClick={() => setIsUploadOpen(true)} title="Publish Content">
                <PlusCircle size={22} color="#3ea6ff" />
              </button>
              <span className="user-badge" onClick={() => navigateTo('/account')} title="Manage Account Profile"><User size={16} /></span>
              <button className="logout-icon-btn" onClick={() => { localStorage.removeItem('tubeyou_user'); setUserEmail(''); navigateTo('/signup'); }} title="Log Out"><LogOut size={18} /></button>
            </div>
          ) : (
            <button className="nav-signin-btn" onClick={() => navigateTo('/login')}>Sign In</button>
          )}
        </div>
      </header>

      <div className="main-body">
        {path !== '/login' && path !== '/signup' && (
          <aside className="sidebar">
            <div className={`sidebar-item ${path === '/home' ? 'active' : ''}`} onClick={() => navigateTo('/home')}><Home size={20} /><span>Home</span></div>
            <div className={`sidebar-item ${path === '/subscriptions' ? 'active' : ''}`} onClick={() => navigateTo('/subscriptions')}><FolderHeart size={20} /><span>Subscriptions</span></div>
            <hr style={{ border: '0', height: '1px', background: '#222', margin: '8px 0' }} />
            <div className={`sidebar-item ${path === '/account' ? 'active' : ''}`} onClick={() => navigateTo('/account')}><User size={20} /><span>My Account</span></div>
          </aside>
        )}

        <main className="content-area">
          {path === '/signup' && <div className="auth-container">
            <div className="auth-box">
              <h2>Create Account</h2>
              <form onSubmit={(e) => handleAuthSubmit(e, true)}>
                <input type="text" placeholder="Enter email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="auth-input" />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="auth-input" />
                {authError && <p className="error-msg">{authError}</p>}
                <button type="submit" className="auth-btn-submit">Sign Up</button>
              </form>
              <div className="auth-toggle-text">Already have an account? <a href="#" onClick={() => navigateTo('/login')}>Login</a></div>
            </div>
          </div>}

          {path === '/login' && <div className="auth-container">
            <div className="auth-box">
              <h2>Sign In</h2>
              <form onSubmit={(e) => handleAuthSubmit(e, false)}>
                <input type="text" placeholder="Enter email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="auth-input" />
                <input type="password" placeholder="Password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="auth-input" />
                {authError && <p className="error-msg">{authError}</p>}
                <button type="submit" className="auth-btn-submit">Log In</button>
              </form>
              <div className="auth-toggle-text">New to TubeYou? <a href="#" onClick={() => navigateTo('/signup')}>Register</a></div>
            </div>
          </div>}

          {/* HOME AND SUBSCRIPTION STREAM FEED PANELS */}
          {(path === '/home' || path === '/subscriptions') && (
            <div className="video-grid">
              {videosFeed.map((video) => (
                <div key={video.id} className="video-card">
                  <div className="thumbnail-wrapper" onClick={() => handleVideoClick(video)}>
                    {video.thumbnail ? <img src={`${API_BASE}/api/thumbnails/${video.thumbnail}`} alt="thumb" /> : <div className="fallback-gradient"></div>}
                  </div>
                  <div className="video-info-wrapper">
                    <div className="channel-avatar" style={{ backgroundImage: video.profile_pic ? `url(${API_BASE}/api/thumbnails/${video.profile_pic})` : 'none', backgroundSize: 'cover' }} onClick={() => video.channel_name && navigateTo(`/channel/@${video.channel_name}`)}></div>
                    <div className="video-details">
                      <h3 className="video-title" onClick={() => handleVideoClick(video)}>{video.title}</h3>
                      <p className="video-metadata handle-link" onClick={() => video.channel_name && navigateTo(`/channel/@${video.channel_name}`)}>{video.account_name || video.uploader_email} {video.channel_name && `@${video.channel_name}`}</p>
                      <p className="video-metadata">{video.views || 0} views</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WATCH VIEW PANEL DISPLAY */}
          {path.startsWith('/watch') && selectedVideo && (
            <div className="watch-container">
              <div className="player-section">
                <div ref={playerContainerRef} className="custom-player-wrapper" style={{ position: 'relative' }}>
                  <video ref={videoRef} key={`${selectedVideo.filename}-${selectedQuality}`} src={`${API_BASE}/video/${selectedVideo.filename}?res=${selectedQuality}`} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(videoRef.current.duration)} onClick={togglePlay} autoPlay className="html5-video-element" />
                  
                  {/* SUBTITLE HUD OVERLAY */}
                  {showCaptions && captionText && (
                    <div className="video-captions-overlay" style={{
                      position: 'absolute',
                      bottom: '75px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      color: '#ffffff',
                      padding: '7px 16px',
                      borderRadius: '2px',
                      fontSize: '16px',
                      fontWeight: '500',
                      pointerEvents: 'none',
                      zIndex: 10,
                      fontFamily: '"Roboto", Arial, sans-serif',
                      textAlign: 'center',
                      textShadow: '0px 1px 2px rgba(0,0,0,0.9)'
                    }}>
                      {captionText}
                    </div>
                  )}

                  <div className="player-controls-deck">
                    <input type="range" min="0" max={duration || 0} value={currentTime} onChange={handleScrubChange} className="player-timeline-scrubber" />
                    <div className="controls-row-layout">
                      <div className="controls-group-left">
                        <button className="ctrl-btn" onClick={togglePlay}>{isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}</button>
                        <button className="ctrl-btn" onClick={() => handleTimeSkip(-10)}><RotateCcw size={20} /></button>
                        <button className="ctrl-btn" onClick={() => handleTimeSkip(10)}><RotateCw size={20} /></button>
                        <div className="volume-control-zone">
                          <button className="ctrl-btn" onClick={toggleMute}>{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                          <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="volume-slider-range" />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                        <button className="ctrl-btn" onClick={() => setShowCaptions(!showCaptions)} title="Toggle Subtitles">
                          <Subtitles size={20} color={showCaptions ? "#3ea6ff" : "#ffffff"} />
                        </button>

                        <button className="ctrl-btn" onClick={() => setShowQualityMenu(!showQualityMenu)} title="Playback Settings">
                          <Settings size={20} color={showQualityMenu ? "#3ea6ff" : "#ffffff"} />
                        </button>

                        {/* QUALITY DROPDOWN OPTIONS */}
                        {showQualityMenu && (
                          <div className="quality-dropdown-menu" style={{
                            position: 'absolute',
                            bottom: '45px',
                            right: '0',
                            backgroundColor: 'rgba(28, 28, 28, 0.95)',
                            borderRadius: '4px',
                            padding: '6px 0',
                            minWidth: '150px',
                            zIndex: 100,
                            boxShadow: '0px 4px 12px rgba(0,0,0,0.5)',
                            border: '1px solid #333'
                          }}>
                            <div style={{ padding: '4px 12px', fontSize: '11px', color: '#aaa', fontWeight: 'bold', textTransform: 'uppercase' }}>Quality Settings</div>
                            {['4K60', '1440p60', '1080p60', '720p60', '480p30', '360p30', '144p30'].map((quality) => (
                              <div 
                                key={quality} 
                                onClick={() => changeResolutionQuality(quality)}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '13px',
                                  color: selectedQuality === quality ? '#3ea6ff' : '#fff',
                                  cursor: 'pointer',
                                  backgroundColor: selectedQuality === quality ? '#2a2a2a' : 'transparent'
                                }}
                                className="quality-item-row"
                              >
                                {selectedQuality === quality ? '✓ ' : ''}{renderQualityLabel(quality)}
                              </div>
                            ))}
                          </div>
                        )}

                        <button className="ctrl-btn" onClick={toggleFullscreen}><Maximize size={20} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="video-engagement-header">
                  <div>
                    <h2>{selectedVideo.title}</h2>
                    <p className="video-metadata" style={{ cursor: 'pointer', color: '#3ea6ff' }} onClick={() => selectedVideo.channel_name && navigateTo(`/channel/@${selectedVideo.channel_name}`)}>
                      Published by {selectedVideo.account_name || selectedVideo.uploader_email} {selectedVideo.channel_name && `@${selectedVideo.channel_name}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {selectedVideo.uploader_email !== userEmail && (
                      <button className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`} onClick={() => handleSubscribeToggle(selectedVideo.uploader_email)}>
                        {isSubscribed ? 'Subscribed' : 'Subscribe'}
                      </button>
                    )}
                    <button className={`interaction-like-btn ${hasLiked ? 'liked' : ''}`} onClick={handleLikeInteraction}>
                      <ThumbsUp size={18} fill={hasLiked ? "#fff" : "none"} /> &nbsp; {selectedVideo.likes || 0}
                    </button>
                  </div>
                </div>
                {/* Comments Module Thread */}
                <div className="comments-module-block">
                  <h3>Comments</h3>
                  <form onSubmit={handleCommentSubmission} className="comments-input-row">
                    <div className="input-action-wrapper">
                      <input type="text" placeholder="Add a public comment..." value={typedComment} onChange={(e) => setTypedComment(e.target.value)} />
                      <button type="submit" className="comment-send-submit"><Send size={16} /></button>
                    </div>
                  </form>
                  <div className="comments-render-list">
                    {videoComments.map((c) => (
                      <div key={c.id} className="single-comment-card">
                        <div className="comment-content-zone">
                          <span className="commenter-identity">{c.account_name || c.user_email}</span>
                          <p className="comment-text-body">{c.comment_text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRIVATE ACCOUNT MANAGEMENT TAB PANEL */}
          {path === '/account' && myProfile && (
            <div className="account-dashboard-wrapper">
              <div className="profile-hero-card">
                <div className="avatar-uploader-workspace">
                  <div className="giant-avatar" style={{ backgroundImage: myProfile.profile_pic ? `url(${API_BASE}/api/thumbnails/${myProfile.profile_pic})` : 'none' }}>
                    {!myProfile.profile_pic && <User size={48} />}
                  </div>
                  <label className="avatar-file-label"><Edit3 size={14} /> Change Photo <input type="file" accept="image/*" onChange={(e) => setAvatarUpload(e.target.files[0])} style={{ display: 'none' }} /></label>
                  {avatarUpload && <p className="pending-indicator">New photo selected: {avatarUpload.name}</p>}
                </div>

                <div className="profile-details-workspace">
                  <form onSubmit={saveProfileUpdates} className="details-form-deck">
                    <div className="field-group"><label>Email Address</label><input type="text" value={myProfile.email} disabled className="dashboard-input disabled" /></div>
                    <div className="field-group"><label>Display Identity Name</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="dashboard-input" /></div>
                    <button type="submit" className="dashboard-save-btn">Save Changes</button>
                  </form>
                  
                  <hr className="dashboard-divider" />
                  
                  <div className="channel-status-box">
                    {myProfile.channel_name ? (
                      <div className="channel-active-indicator">
                        <CheckCircle color="#3ea6ff" size={20} />
                        <div>
                          <h4>Your Channel is fully active</h4>
                          <p onClick={() => navigateTo(`/channel/@${myProfile.channel_name}`)} className="channel-link-routing">View public channel space: <strong>@{myProfile.channel_name}</strong></p>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleCreateChannel} className="channel-creation-form">
                        <h4>Create a YouTube Channel</h4>
                        <p>You must establish a public creator handle to upload videos onto TubeYou.</p>
                        <div className="creation-row">
                          <input type="text" placeholder="Choose unique channel handle (e.g. techguy)" value={newChannelHandle} onChange={(e) => setNewChannelHandle(e.target.value)} className="dashboard-input" />
                          <button type="submit" className="create-channel-submit-btn">Launch Channel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <div className="recent-uploads-workspace">
                <h3>Your Published Content</h3>
                {myRecentVideos.length === 0 ? <p className="empty-message">No videos uploaded yet.</p> : (
                  <div className="video-grid">
                    {myRecentVideos.map(v => (
                      <div key={v.id} className="video-card" onClick={() => handleVideoClick(v)}>
                        <div className="thumbnail-wrapper">{v.thumbnail && <img src={`${API_BASE}/api/thumbnails/${v.thumbnail}`} alt="" />}</div>
                        <h4 className="video-title" style={{ marginTop: '8px' }}>{v.title}</h4>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISITING PUBLIC CHANNELS VIEWPORT */}
          {path.includes('/channel/@') && publicChannelData && (
            <div className="public-channel-viewport">
              {publicChannelData.error ? <div className="channel-error-msg">{publicChannelData.error}</div> : (
                <div>
                  <div className="channel-billboard-header">
                    <div className="billboard-avatar" style={{ backgroundImage: publicChannelData.profile.profile_pic ? `url(${API_BASE}/api/thumbnails/${publicChannelData.profile.profile_pic})` : 'none' }}></div>
                    <div className="billboard-meta">
                      <h1>{publicChannelData.profile.account_name}</h1>
                      <p className="handle">@{publicChannelData.profile.channel_name}</p>
                      <p className="subs-metrics">{publicChannelData.subscribers} Subscribers • {publicChannelData.videos.length} Videos</p>
                      {publicChannelData.profile.email !== userEmail && (
                        <button className={`subscribe-btn ${isSubscribed ? 'subscribed' : ''}`} style={{ marginLeft: '0', marginTop: '12px' }} onClick={() => handleSubscribeToggle(publicChannelData.profile.email)}>
                          {isSubscribed ? 'Subscribed' : 'Subscribe'}
                        </button>
                      )}
                    </div>
                  </div>
                  <hr className="dashboard-divider" />
                  <div className="channel-videos-container">
                    <h3>Uploaded Videos</h3>
                    {publicChannelData.videos.length === 0 ? <p className="empty-message">This creator has not uploaded any content yet.</p> : (
                      <div className="video-grid">
                        {publicChannelData.videos.map(video => (
                          <div key={video.id} className="video-card" onClick={() => handleVideoClick(video)}>
                            <div className="thumbnail-wrapper">{video.thumbnail && <img src={`${API_BASE}/api/thumbnails/${video.thumbnail}`} alt="" />}</div>
                            <h4 className="video-title" style={{ marginTop: '8px' }}>{video.title}</h4>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ENHANCED VIDEO UPLOADER MODAL DRAWER */}
      {isUploadOpen && (
        <div className="modal-overlay">
          <div className="modal-box premium-uploader-deck">
            <div className="modal-header">
              <div className="header-title-combo"><Video size={20} color="#ff0000" /><h3>Studio Content Creator Pipeline</h3></div>
              <X style={{ cursor: 'pointer' }} onClick={() => { setIsUploadOpen(false); setUploadStatus(''); }} />
            </div>
            
            <form onSubmit={handleUploadSubmit} className="uploader-form-layout">
              <div className="input-block">
                <label>Video Production Title</label>
                <input type="text" placeholder="Name your masterpiece..." value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="auth-input styled-input" />
              </div>

              <div className="upload-dropzone-grid">
                <label className="dropzone-card">
                  <Video size={32} color="#aaa" />
                  <span>Select .mp4 Video</span>
                  <input type="file" accept="video/mp4" onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                  {selectedFile && <p className="file-selected-tag">{selectedFile.name}</p>}
                </label>

                <label className="dropzone-card">
                  <Image size={32} color="#aaa" />
                  <span>Select Cover Thumbnail</span>
                  <input type="file" accept="image/*" onChange={(e) => setSelectedThumbnail(e.target.files[0])} style={{ display: 'none' }} />
                  {selectedThumbnail && <p className="file-selected-tag">{selectedThumbnail.name}</p>}
                </label>
              </div>

              {uploadStatus && <div className="uploader-status-alert-pill"><p>{uploadStatus}</p></div>}
              
              <div className="uploader-action-footer">
                <button type="button" className="uploader-cancel" onClick={() => setIsUploadOpen(false)}>Discard</button>
                <button type="submit" className="uploader-publish-btn">Publish Live</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;