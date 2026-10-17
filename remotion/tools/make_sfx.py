"""효과음 합성 (저작권 걱정 없음). python3 tools/make_sfx.py → public/sfx/*.mp3
whoosh: 장면 전환 / pop: 항목 등장 / tick: 숫자 카운트 / chime: 챕터·성경 구절 / check: 체크리스트 / swell: 마지막 구독 장면"""
import numpy as np, wave, subprocess, pathlib
SR = 44100
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'sfx'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)
t_ = lambda d: np.arange(int(SR * d)) / SR

def env(n, a, r, curve=3.0):
    x = np.ones(n); A = max(1, int(SR * a)); R = max(1, int(SR * r))
    x[:A] = np.linspace(0, 1, A) ** 2
    x[-R:] *= np.linspace(1, 0, R) ** curve
    return x

def lowpass(x, cutoff):  # 한 극 IIR, 시간에 따라 바뀌는 cutoff 지원
    cutoff = np.broadcast_to(cutoff, x.shape)
    y = np.zeros_like(x); prev = 0.0
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    for i in range(len(x)):
        prev += a[i] * (x[i] - prev); y[i] = prev
    return y

def save(name, x, gain_db=-3):
    x = x / (np.max(np.abs(x)) + 1e-9) * (10 ** (gain_db / 20))
    st = np.stack([x, x], 1)
    wav = OUT / (name + '.wav')
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-b:a', '128k', str(OUT / (name + '.mp3'))], check=True)
    wav.unlink()

# whoosh: 대역이 올라갔다 내려가는 바람 소리
d = 0.55; t = t_(d); n = len(t)
noise = rng.standard_normal(n)
sweep = 300 + 3200 * np.sin(np.pi * t / d) ** 2
w = lowpass(noise, sweep) - lowpass(noise, sweep * 0.25)
save('whoosh', w * env(n, 0.22, 0.3, 2), -6)

# pop: 짧게 떨어지는 사인 + 클릭
d = 0.14; t = t_(d); n = len(t)
f = 900 * np.exp(-t * 28) + 380
p = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 34)
save('pop', p + 0.15 * rng.standard_normal(n) * np.exp(-t * 400), -4)

# tick: 아주 짧은 나무 클릭
d = 0.05; t = t_(d); n = len(t)
k = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 160) + 0.4 * np.sin(2 * np.pi * 5200 * t) * np.exp(-t * 300)
save('tick', k, -8)

# chime: 맑은 종소리 화음 (C6 E6 G6 + 배음)
d = 1.6; t = t_(d); n = len(t)
c = sum(a * np.sin(2 * np.pi * fr * t) * np.exp(-t * dec) for fr, a, dec in
        [(1046.5, 1, 2.2), (1318.5, 0.7, 2.6), (1568, 0.55, 3.0), (2093, 0.25, 4.5), (3136, 0.12, 6)])
save('chime', c * env(n, 0.004, 0.4, 2), -7)

# check: 올라가는 두 음
d = 0.26; t = t_(d); n = len(t)
f = np.where(t < 0.09, 880, 1320)
ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.003, 0.12, 2) * np.exp(-t * 6)
save('check', ch, -6)

# swell: 부드럽게 커지는 패드 (구독 장면)
d = 1.8; t = t_(d); n = len(t)
pad = sum(np.sin(2 * np.pi * fr * t + np.sin(2 * np.pi * 0.7 * t) * 0.3) for fr in (261.6, 329.6, 392, 523.3))
save('swell', lowpass(pad, 1800) * env(n, 1.1, 0.5, 2), -9)
print('ok', sorted(p.name for p in OUT.iterdir()))
