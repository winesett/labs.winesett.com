(() => {
  'use strict';

  const start = () => {
    const track = document.getElementById('relay-story');
    if (!track) return;

    const stage = track.querySelector('.story-stage');
    const label = document.getElementById('story-label');
    const agentsSection = document.getElementById('agents');
    const copies = [...track.querySelectorAll('.story-copy[data-chapter]')]
      .filter(copy => ['0', '1', '2'].includes(copy.dataset.chapter))
      .sort((a, b) => Number(a.dataset.chapter) - Number(b.dataset.chapter));
    const buttons = [...track.querySelectorAll('.chapter-controls button[data-progress]')]
      .map(button => ({element: button, progress: Number(button.dataset.progress)}))
      .filter(button => Number.isFinite(button.progress));
    const anchors = [...document.querySelectorAll('a[href="#agents"]')];
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const chapterWindows = [
      [0, 0.20],
      [0.20, 0.57],
      [0.57, 1],
    ];
    const storyLabels = ['Scroll', 'Keep scrolling', 'Choose an agent'];
    const fadeHalf = 0.025;
    const progressTimeConstant = 0.09;
    const progressSnapEpsilon = 0.00005;
    let frame = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let lastFrameTime = 0;
    let hasRendered = false;
    let activeChapter = 0;
    let lastAgent = null;
    let manualPaused = false;
    let staticMode = false;
    let stopped = false;
    let bindingsActive = false;
    let accessibleChapter = -1;
    let labelChapter = -1;
    let buttonChapter = -1;
    let staticFrameDirty = true;
    let lastAppliedProgress = null;
    let lastAppliedStaticMode = null;
    let lastAppliedVisible = null;

    const clamp = value => {
      if (!Number.isFinite(value)) return 0;
      return Math.min(1, Math.max(0, value));
    };

    const currentChapter = progress => {
      const index = chapterWindows.findIndex(([from, to], chapter) => (
        progress >= from && (progress < to || chapter === chapterWindows.length - 1)
      ));
      return index < 0 ? chapterWindows.length - 1 : index;
    };

    const storyIsVisible = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const rect = track.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < viewportHeight;
    };

    const hasMotionPauseClass = () => (
      document.body?.classList.contains('motion-paused') ||
      document.documentElement.classList.contains('motion-paused')
    );

    const setInert = (element, inert) => {
      if ('inert' in element) element.inert = inert;
      if (inert) element.setAttribute('inert', '');
      else element.removeAttribute('inert');
    };

    const resetCopyAccessibility = () => {
      accessibleChapter = -1;
      copies.forEach(copy => {
        copy.removeAttribute('aria-hidden');
        setInert(copy, false);
        copy.removeAttribute('data-active');
        copy.style.removeProperty('opacity');
        copy.style.removeProperty('transform');
        copy.style.removeProperty('visibility');
        copy.style.removeProperty('pointer-events');
      });
    };

    const setStoryMode = () => {
      const nextStaticMode = Boolean(motionQuery?.matches || manualPaused || hasMotionPauseClass());
      if (nextStaticMode === staticMode && track.classList.contains('story-static') === nextStaticMode) {
        return false;
      }

      staticMode = nextStaticMode;
      track.classList.toggle('story-static', staticMode);
      lastAgent = null;
      stage?.removeAttribute('data-agent');
      staticFrameDirty = true;
      if (staticMode) resetCopyAccessibility();
      else accessibleChapter = -1;
      return true;
    };

    const updateLabel = chapter => {
      if (!label || labelChapter === chapter) return;
      labelChapter = chapter;
      label.textContent = storyLabels[chapter] || storyLabels[0];
    };

    const updateButtons = chapter => {
      if (!buttons.length || buttonChapter === chapter) return;
      buttonChapter = chapter;
      const center = (chapterWindows[chapter][0] + chapterWindows[chapter][1]) / 2;
      const activeButton = buttons.reduce((best, button) => (
        Math.abs(button.progress - center) < Math.abs(best.progress - center) ? button : best
      ), buttons[0]);
      buttons.forEach(button => {
        const active = button === activeButton;
        button.element.setAttribute('aria-pressed', String(active));
        if (active) button.element.setAttribute('aria-current', 'step');
        else button.element.removeAttribute('aria-current');
        button.element.toggleAttribute('data-active', active);
      });
    };

    const setChapterAccessibility = chapter => {
      if (accessibleChapter === chapter) return;
      accessibleChapter = chapter;
      copies.forEach((copy, index) => {
        const active = index === chapter;
        copy.setAttribute('aria-hidden', String(!active));
        setInert(copy, !active);
        copy.toggleAttribute('data-active', active);
      });
    };

    const copyOpacity = (progress, index, from, to) => {
      const enter = index === 0 ? 1 : clamp((progress - (from - fadeHalf)) / (fadeHalf * 2));
      const leave = index === chapterWindows.length - 1
        ? 1
        : clamp(((to + fadeHalf) - progress) / (fadeHalf * 2));
      return Math.min(enter, leave);
    };

    const updateCopies = (progress, chapter) => {
      copies.forEach((copy, index) => {
        const [from, to] = chapterWindows[index] || [0, 1];
        const opacity = copyOpacity(progress, index, from, to);
        const enter = index === 0 ? 1 : clamp((progress - (from - fadeHalf)) / (fadeHalf * 2));
        const leave = index === chapterWindows.length - 1
          ? 1
          : clamp(((to + fadeHalf) - progress) / (fadeHalf * 2));
        const translateY = ((1 - enter) * 22) - ((1 - leave) * 12);
        copy.style.opacity = opacity.toFixed(4);
        copy.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
        copy.style.visibility = opacity > 0.005 ? 'visible' : 'hidden';
        copy.style.pointerEvents = index === chapter && opacity > 0.005 ? 'auto' : 'none';
      });
    };

    const agentForProgress = progress => (
      progress < 0.79 ? 'grok' : progress < 0.92 ? 'muse' : 'dot'
    );

    const updateAgent = (progress, visible) => {
      const eligible = !staticMode && progress >= 0.60 && visible;
      if (!eligible) {
        if (lastAgent !== null || stage?.hasAttribute('data-agent')) {
          lastAgent = null;
          stage?.removeAttribute('data-agent');
        }
        return;
      }

      const agent = agentForProgress(progress);
      if (stage?.dataset.agent !== agent) stage?.setAttribute('data-agent', agent);
      if (agent === lastAgent) return;
      lastAgent = agent;
      window.dispatchEvent(new CustomEvent('relay-agent', {detail: {agent}}));
    };

    const dispatchProgress = progress => {
      stage?.setAttribute('data-progress', progress.toFixed(4));
      stage?.style.setProperty('--story-progress', staticMode ? '0' : progress.toFixed(4));
      window.dispatchEvent(new CustomEvent('relay-story', {
        detail: {
          progress,
          chapter: activeChapter,
        },
      }));
    };

    const applyProgress = (progress, visible = null) => {
      const nextProgress = clamp(progress);
      setStoryMode();
      const nextChapter = currentChapter(nextProgress);
      currentProgress = nextProgress;
      activeChapter = nextChapter;
      const storyVisible = visible ?? (!staticMode && storyIsVisible());
      const changed = lastAppliedProgress === null
        || Math.abs(nextProgress - lastAppliedProgress) > 0.000001
        || lastAppliedStaticMode !== staticMode
        || lastAppliedVisible !== storyVisible;

      if (!changed) return;
      lastAppliedProgress = nextProgress;
      lastAppliedStaticMode = staticMode;
      lastAppliedVisible = storyVisible;

      if (!staticMode) {
        setChapterAccessibility(nextChapter);
        updateCopies(nextProgress, nextChapter);
      }
      updateLabel(nextChapter);
      updateButtons(nextChapter);
      updateAgent(nextProgress, storyVisible);
      dispatchProgress(nextProgress);
    };

    const readStoryState = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const rect = track.getBoundingClientRect();
      stage?.toggleAttribute('data-scrolled', rect.top < -0.5);
      return {
        progress: staticMode
          ? currentProgress
          : clamp(-rect.top / Math.max(1, rect.height - viewportHeight)),
        visible: rect.bottom > 0 && rect.top < viewportHeight,
      };
    };

    const renderFrame = timestamp => {
      frame = 0;
      const state = readStoryState();

      if (staticMode) {
        lastFrameTime = 0;
        if (staticFrameDirty || !hasRendered) {
          hasRendered = true;
          applyProgress(currentProgress, state.visible);
          staticFrameDirty = false;
        }
        return;
      }

      targetProgress = state.progress;
      const elapsed = lastFrameTime
        ? Math.min(80, Math.max(0, timestamp - lastFrameTime)) / 1000
        : (1 / 60);
      lastFrameTime = timestamp;

      if (!hasRendered) {
        currentProgress = targetProgress;
        hasRendered = true;
      } else {
        const gap = targetProgress - currentProgress;
        currentProgress = Math.abs(gap) <= progressSnapEpsilon
          ? targetProgress
          : currentProgress + (gap * (1 - Math.exp(-elapsed / progressTimeConstant)));
      }

      applyProgress(currentProgress, state.visible);
      if (Math.abs(targetProgress - currentProgress) > progressSnapEpsilon && !stopped) {
        frame = window.requestAnimationFrame(renderFrame);
      }
    };

    const requestUpdate = () => {
      if (frame || stopped) return;
      frame = window.requestAnimationFrame(renderFrame);
    };

    const scrollToProgress = (progress, staticTarget = null) => {
      const targetProgress = clamp(progress);
      if (staticMode) {
        (staticTarget || copies[currentChapter(targetProgress)])?.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        });
        return;
      }

      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const rect = track.getBoundingClientRect();
      const distance = Math.max(0, rect.height - viewportHeight);
      const top = window.scrollY + rect.top + (distance * targetProgress);
      window.scrollTo({top, behavior: 'smooth'});
    };

    const onScroll = () => requestUpdate();
    const onResize = () => requestUpdate();
    const changeStoryMode = () => {
      const wasVisible = storyIsVisible();
      const savedProgress = currentProgress;
      const savedChapter = currentChapter(savedProgress);
      const changed = setStoryMode();
      if (changed && wasVisible) {
        const rect = track.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
        const top = staticMode
          ? window.scrollY + copies[savedChapter].getBoundingClientRect().top - headerHeight - 24
          : window.scrollY + rect.top + Math.max(0, rect.height - viewportHeight) * savedProgress;
        window.scrollTo({top: Math.max(0, top), behavior: 'auto'});
      }
      targetProgress = savedProgress;
      lastFrameTime = 0;
      requestUpdate();
    };
    const onRelayMotion = event => {
      manualPaused = Boolean(event.detail?.paused);
      changeStoryMode();
    };
    const onReducedMotion = () => changeStoryMode();
    const onChapterClick = event => {
      scrollToProgress(Number(event.currentTarget.dataset.progress));
    };
    const onAgentsAnchorClick = event => {
      event.preventDefault();
      scrollToProgress(0.95, agentsSection);
    };
    const addMotionPreferenceListener = () => {
      if (!motionQuery) return;
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', onReducedMotion);
      else motionQuery.addListener?.(onReducedMotion);
    };
    const removeMotionPreferenceListener = () => {
      if (!motionQuery) return;
      if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', onReducedMotion);
      else motionQuery.removeListener?.(onReducedMotion);
    };
    const onPageHide = event => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrameTime = 0;
      bindingsActive = false;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('relay-motion', onRelayMotion);
      removeMotionPreferenceListener();
      buttons.forEach(button => button.element.removeEventListener('click', onChapterClick));
      anchors.forEach(anchor => anchor.removeEventListener('click', onAgentsAnchorClick));
      stopped = !event.persisted;
    };
    const onPageShow = () => {
      if (stopped || bindingsActive) return;
      bindingsActive = true;
      window.addEventListener('scroll', onScroll, {passive: true});
      window.addEventListener('resize', onResize, {passive: true});
      window.addEventListener('relay-motion', onRelayMotion);
      addMotionPreferenceListener();
      buttons.forEach(button => button.element.addEventListener('click', onChapterClick));
      anchors.forEach(anchor => anchor.addEventListener('click', onAgentsAnchorClick));
      setStoryMode();
      staticFrameDirty = true;
      requestUpdate();
    };

    window.addEventListener('pagehide', onPageHide, {passive: true});
    window.addEventListener('pageshow', onPageShow, {passive: true});
    onPageShow();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else {
    start();
  }
})();
