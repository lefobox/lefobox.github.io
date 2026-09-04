export default {
  async fetch(request, env) {
    return new Response("LEFOBOX PAYMENT WORKER OK", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=UTF-8"
      }
    });
  }
};
