"use client";

import { useEffect, useRef, useState } from "react";

export default function useRequestWizardNav({ steps, validateStep }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState(null);
  const [pendingScrollField, setPendingScrollField] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!pendingScrollField) return;

    const field = pendingScrollField;
    const timeoutId = window.setTimeout(() => {
      const root = formRef.current;
      if (!root) {
        setPendingScrollField(null);
        return;
      }

      const el =
        root.querySelector(`[data-field="${field}"]`) ||
        root.querySelector(`[name="${field}"]`);

      if (el) {
        const navHeight =
          document.querySelector("nav.sticky")?.getBoundingClientRect()
            .height || 0;
        const top =
          el.getBoundingClientRect().top + window.scrollY - navHeight - 24;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

        const focusable = el.matches("input, select, textarea, button")
          ? el
          : el.querySelector("input, select, textarea, button");
        focusable?.focus?.({ preventScroll: true });
      }

      setPendingScrollField(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pendingScrollField, currentStep]);

  const goToStep = (index) => {
    if (index === currentStep) return;
    if (index < currentStep) {
      setStepError(null);
      setCurrentStep(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let i = currentStep; i < index; i += 1) {
      const result = validateStep(i);
      if (result) {
        setStepError(result.error);
        setCurrentStep(i);
        setPendingScrollField(result.field);
        return;
      }
    }

    setStepError(null);
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = ({ onLastStep } = {}) => {
    const result = validateStep(currentStep);
    if (result) {
      setStepError(result.error);
      setPendingScrollField(result.field);
      return;
    }

    if (currentStep >= steps.length - 1) {
      onLastStep?.();
      return;
    }

    setStepError(null);
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showFirstInvalidStep = () => {
    for (let i = 0; i < steps.length; i += 1) {
      const result = validateStep(i);
      if (result) {
        setCurrentStep(i);
        setStepError(result.error);
        setPendingScrollField(result.field);
        return result.error;
      }
    }
    return null;
  };

  return {
    currentStep,
    setCurrentStep,
    stepError,
    setStepError,
    formRef,
    goToStep,
    goNext,
    goBack,
    showFirstInvalidStep,
  };
}
