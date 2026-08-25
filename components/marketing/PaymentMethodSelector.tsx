"use client";

import styles from "./PaymentMethodSelector.module.css";

export type PaymentOption = "full" | "deposit" | "bnpl" | "cash";

interface PaymentMethod {
  id: PaymentOption;
  title: string;
  subtitle: string;
}

const BASE_METHODS: PaymentMethod[] = [
  { id: "full", title: "Pay in full", subtitle: "Pay online via digital wallets / credit card" },
  { id: "deposit", title: "50% downpayment", subtitle: "Pay online via digital wallets / credit card" },
  { id: "bnpl", title: "Buy Now, Pay Later", subtitle: "Pay in installments through BillEase" },
  { id: "cash", title: "Cash", subtitle: "Pay at the studio" },
];

interface Props {
  value: PaymentOption;
  onChange: (value: PaymentOption) => void;
  showBnpl?: boolean;
}

export default function PaymentMethodSelector({ value, onChange, showBnpl = false }: Props) {
  const methods = showBnpl ? BASE_METHODS : BASE_METHODS.filter((m) => m.id !== "bnpl");
  return (
    <div className={styles.grid}>
      {methods.map((method) => (
        <button
          key={method.id}
          type="button"
          aria-pressed={value === method.id}
          onClick={() => onChange(method.id)}
          className={styles.card}
        >
          <strong>{method.title}</strong>
          <span>{method.subtitle}</span>
        </button>
      ))}
    </div>
  );
}
