import datetime
from typing import Optional


def generate_token(
    user_id: str,
    jwt_secret: str,
    jwt_algorithm: str = "HS256",
    jwt_exp_delta_seconds: Optional[int] = None,
):
    """
    Generate a token for SkyPortal to access Kowalski
    """
    import jwt

    jwt_config = {
        "user_id": user_id,
        "JWT_SECRET": jwt_secret,
        "JWT_ALGORITHM": jwt_algorithm,
        "JWT_EXP_DELTA_SECONDS": jwt_exp_delta_seconds,
    }

    payload = {"user_id": jwt_config["user_id"]}
    if jwt_config["JWT_EXP_DELTA_SECONDS"]:
        payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(
            seconds=jwt_config["JWT_EXP_DELTA_SECONDS"]
        )
    jwt_token = jwt.encode(
        payload, jwt_config["JWT_SECRET"], jwt_config["JWT_ALGORITHM"]
    )

    return jwt_token
