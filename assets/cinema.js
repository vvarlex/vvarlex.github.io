(() => {
  'use strict';
  const sound = document.getElementById('sound-toggle');
  const dialog = document.getElementById('soundtrack');
  const player = document.getElementById('spotify-player');
  const kind = window.AudioContext || window.webkitAudioContext;
  let audio;
  let enabled = false;
  try { enabled = localStorage.getItem('wlx-click-sound') === 'on'; } catch {}

  function paintSound() {
    sound.setAttribute('aria-pressed', String(enabled));
    sound.textContent = enabled ? 'Sound on' : 'Sound off';
  }

  async function playClick(navigate) {
    try {
      audio ||= new kind();
      if (audio.state !== 'running') await audio.resume();
      if (!enabled) return;
      const now = audio.currentTime;
      const pitches = navigate ? [440, 554.37, 659.25] : [587.33, 880];
      pitches.forEach((pitch, index) => {
        const start = now + index * .022;
        const voice = audio.createOscillator();
        const envelope = audio.createGain();
        voice.type = index === 0 ? 'triangle' : 'sine';
        voice.frequency.value = pitch;
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(.03 / (index + 1), start + .012);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + .24);
        voice.connect(envelope).connect(audio.destination);
        voice.start(start);
        voice.stop(start + .25);
      });
    } catch {}
  }

  if (kind) {
    sound.hidden = false;
    paintSound();
    sound.addEventListener('click', () => {
      enabled = !enabled;
      paintSound();
      try { localStorage.setItem('wlx-click-sound', enabled ? 'on' : 'off'); } catch {}
      if (enabled) playClick(true);
    });
    document.addEventListener('click', event => {
      const control = event.target.closest('button, a[href], summary, [role="button"]');
      if (enabled && control && control !== sound && !control.matches(':disabled,[aria-disabled="true"]')) {
        playClick(control.matches('a[href], #menu'));
      }
    }, true);
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('#music-open,[data-open-soundtrack]');
    if (!trigger) return;
    if (!player.firstElementChild) {
      const iframe = document.createElement('iframe');
      iframe.src = 'https://open.spotify.com/embed/track/7Cpc0ndWxYB6sUSkOwxzrK?utm_source=generator';
      iframe.title = 'Skiboy by menace Santana on Spotify';
      iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      iframe.width = '100%';
      iframe.height = '152';
      player.append(iframe);
    }
    dialog.showModal();
    dialog.querySelector('button').focus();
    dialog.addEventListener('close', () => {
      const focus = trigger.id === 'music-open' ? document.getElementById('menu') : trigger;
      focus.focus({preventScroll:true});
    }, {once:true});
  });
})();
