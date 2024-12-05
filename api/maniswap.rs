use serde::{Deserialize, Serialize};
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use std::f64;

#[derive(Deserialize, Serialize)]
struct SwapRequest {
    token_a: String,
    reserve_a: f64,
    token_b: String,
    reserve_b: f64,
    input_token: String,
    amount_in: f64,
}

#[derive(Serialize)]
struct SwapResponse {
    amount_out: f64,
    new_reserve_a: f64,
    new_reserve_b: f64,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    let swap_request: SwapRequest = match serde_json::from_slice(req.body()) {
        Ok(data) => data,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("Invalid request body".into())?)
        }
    };

    let (amount_out, new_reserve_a, new_reserve_b) = if swap_request.input_token == swap_request.token_a {
        // Token A is being swapped for Token B
        let amount_out = maniswap_swap(
            swap_request.reserve_a,
            swap_request.reserve_b,
            swap_request.amount_in,
        );
        (
            amount_out,
            swap_request.reserve_a + swap_request.amount_in,
            swap_request.reserve_b - amount_out,
        )
    } else if swap_request.input_token == swap_request.token_b {
        // Token B is being swapped for Token A
        let amount_out = maniswap_swap(
            swap_request.reserve_b,
            swap_request.reserve_a,
            swap_request.amount_in,
        );
        (
            amount_out,
            swap_request.reserve_a - amount_out,
            swap_request.reserve_b + swap_request.amount_in,
        )
    } else {
        return Ok(Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body("Invalid input token".into())?)
    };

    let response = SwapResponse {
        amount_out,
        new_reserve_a,
        new_reserve_b,
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&response)?.into())?)
}

fn maniswap_swap(reserve_in: f64, reserve_out: f64, amount_in: f64) -> f64 {
    // Maniswap protocol formula: y^p * n^(1-p) = k
    // Assume p = 0.5 for simplicity, but this can be adjusted.
    let p = 0.5;
    let y = reserve_out;
    let n = reserve_in + amount_in;
    let k = (y.powf(p)) * (n.powf(1.0 - p));
    let new_y = k / n.powf(1.0 - p);
    y - new_y
}