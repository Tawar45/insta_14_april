import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>AI Instafeed Expert</h1>
        <p className={styles.text}>
          Boost social proof, credibility, and sales by showcasing your Instagram feeds and stories.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" placeholder="your-store.myshopify.com" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in / Install
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Auto-Sync Feed</strong>. Seamlessly sync your Instagram posts and reels to your store without any performance impact.
          </li>
          <li>
            <strong>Premium Layouts</strong>. Display your posts in responsive grids or modern story layouts optimized for mobile and desktop.
          </li>
          <li>
            <strong>Social Proof & Conversions</strong>. Show like and comment counts, let users open interactive popups, and boost customer trust.
          </li>
        </ul>
      </div>
    </div>
  );
}
