import Meta from "@/components/meta";

export default function Head({ params }: { params: { slug: string } }) {
  return (
    <Meta
      title={`Check out this ShareGPT conversation`}
      image={`https://shareg.pt/api/og?chat=${params.slug}`}
      imageAlt={`This is a preview image for a conversation betwen a human and a GPT-3 chatbot.`}
    />
  );
}
