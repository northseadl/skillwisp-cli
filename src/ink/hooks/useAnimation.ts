/**
 * SkillWisp CLI - 动画 Hooks
 * 
 * 提供终端友好的动画效果
 */

import { useState, useEffect } from 'react';

/**
 * 打字机效果 Hook
 * 逐字显示文本，营造动态感
 */
export function useTypewriter(text: string, speed: number = 30): string {
    const [displayed, setDisplayed] = useState('');

    useEffect(() => {
        setDisplayed('');
        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayed(text.slice(0, index + 1));
                index++;
            } else {
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return displayed;
}

/**
 * 渐入效果 Hook
 * 延迟显示内容
 */
export function useFadeIn(delay: number = 100): boolean {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timeout);
    }, [delay]);

    return visible;
}

/**
 * 脉冲效果 Hook
 * 在两个状态之间切换（用于光标闪烁等）
 */
export function usePulse(interval: number = 500): boolean {
    const [active, setActive] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setActive((prev) => !prev), interval);
        return () => clearInterval(timer);
    }, [interval]);

    return active;
}

/**
 * 进度条动画 Hook
 * 0-100 自动增长
 */
export function useProgress(
    duration: number = 1000,
    steps: number = 20
): number {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const stepDuration = duration / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += 100 / steps;
            if (current >= 100) {
                setProgress(100);
                clearInterval(interval);
            } else {
                setProgress(Math.round(current));
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [duration, steps]);

    return progress;
}

/**
 * 计数动画 Hook
 * 数字从 0 渐变到目标值
 */
export function useCountUp(target: number, duration: number = 500): number {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const steps = 20;
        const stepValue = target / steps;
        const stepDuration = duration / steps;
        let current = 0;

        const interval = setInterval(() => {
            current += stepValue;
            if (current >= target) {
                setCount(target);
                clearInterval(interval);
            } else {
                setCount(Math.round(current));
            }
        }, stepDuration);

        return () => clearInterval(interval);
    }, [target, duration]);

    return count;
}
