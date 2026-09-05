const PRODUCTS = {
  stage: {
    name: "Stage",
    price: 29
  },

  under: {
    name: "Under",
    price: 70
  },

  inferno: {
    name: "Inferno",
    price: 149
  },

  overlord: {
    name: "Overlord",
    price: 200
  },

  phantom: {
    name: "Phantom",
    price: 280
  },

  legend: {
    name: "Legend",
    price: 350
  },

  lefo: {
    name: "Lefo",
    price: 480
  },

  custom: {
    name: "Custom",
    price: 590
  }
};

const PROMOS = {
  leade4k: 0.10,
  foxik: 0.10
};

const SITE_URL = "https://lefobox.gomc.fun";

function corsHeaders(origin) {
  const allowedOrigins = [
    SITE_URL
  ];

  const allowOrigin = allowedOrigins.includes(origin)
    ? origin
    : SITE_URL;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin)
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || SITE_URL;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
      });
    }

    /*
     * СОЗДАНИЕ ПЛАТЕЖА
     */

    if (
      url.pathname === "/api/create-payment" &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        const productId = String(body.productId || "")
          .trim()
          .toLowerCase();

        const promoCode = String(body.promoCode || "")
          .trim()
          .toLowerCase();

        const product = PRODUCTS[productId];

        if (!product) {
          return json(
            {
              success: false,
              error: "Неизвестный товар"
            },
            400,
            origin
          );
        }

        let amount = product.price;

        if (PROMOS[promoCode]) {
          amount =
            Math.round(
              amount * (1 - PROMOS[promoCode]) * 100
            ) / 100;
        }

        if (
          !env.PLATEGA_MERCHANT_ID ||
          !env.PLATEGA_SECRET
        ) {
          return json(
            {
              success: false,
              error: "Platega не настроена"
            },
            500,
            origin
          );
        }

        const payload = {
          productId,
          productName: product.name,
          promoCode: promoCode || null
        };

        const response = await fetch(
          "https://app.platega.io/v2/transaction/process",
          {
            method: "POST",

            headers: {
              "X-MerchantId": env.PLATEGA_MERCHANT_ID,
              "X-Secret": env.PLATEGA_SECRET,
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              paymentDetails: {
                amount,
                currency: "RUB"
              },

              description:
                `LEFOBOX — ${product.name}`,

              return: SITE_URL,

              failedUrl: SITE_URL,

              payload: JSON.stringify(payload)
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.log(
            "Platega error:",
            JSON.stringify(data)
          );

          return json(
            {
              success: false,
              error: "Ошибка Platega"
            },
            response.status,
            origin
          );
        }

        if (!data.url) {
          return json(
            {
              success: false,
              error: "Platega не вернула ссылку"
            },
            502,
            origin
          );
        }

        return json(
          {
            success: true,
            transactionId: data.transactionId,
            url: data.url,
            amount,
            product: product.name
          },
          200,
          origin
        );

      } catch (error) {
        console.log(
          "Create payment error:",
          error
        );

        return json(
          {
            success: false,
            error: "Ошибка сервера"
          },
          500,
          origin
        );
      }
    }

    /*
     * CALLBACK PLATEGA
     */

    if (
      url.pathname === "/api/callback" &&
      request.method === "POST"
    ) {
      try {
        const merchantId =
          request.headers.get("X-MerchantId");

        const secret =
          request.headers.get("X-Secret");

        if (
          merchantId !== env.PLATEGA_MERCHANT_ID ||
          secret !== env.PLATEGA_SECRET
        ) {
          return new Response(
            "Unauthorized",
            {
              status: 401
            }
          );
        }

        const data = await request.json();

        console.log(
          "PLATEGA CALLBACK:",
          JSON.stringify(data)
        );

        return new Response("OK", {
          status: 200
        });

      } catch (error) {
        console.log(
          "Callback error:",
          error
        );

        return new Response(
          "Bad Request",
          {
            status: 400
          }
        );
      }
    }

    return json(
      {
        success: false,
        error: "Not found"
      },
      404,
      origin
    );
  }
};
