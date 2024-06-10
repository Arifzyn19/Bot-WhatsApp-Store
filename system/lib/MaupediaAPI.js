import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";

class MaupediaAPI {
  constructor(apiKey, apiId, secretKey) {
    this.apiKey = apiKey;
    this.apiId = apiId;
    this.secretKey = secretKey;
  }

  generateSign() {
    return crypto
      .createHash("sha1")
      .update(this.apiId + this.apiKey)
      .digest("hex");
  }

  async profile() {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);

    try {
      const response = await axios.post(
        "https://maupedia.com/api/profile",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from profile: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async prepaid(service, data_no) {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "order");
    formData.append("service", service);
    formData.append("data_no", data_no);

    try {
      const response = await axios.post(
        "https://maupedia.com/api/prepaid",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from prepaid: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async postpaid(service, data_no) {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "inq-pasca");
    formData.append("service", service);
    formData.append("data_no", data_no);

    try {
      const response = await axios.post(
        "https://maupedia.com/api/postpaid",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from postpaid: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async gameFeature(service, data_no, data_zone = "") {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "order");
    formData.append("service", service);
    formData.append("data_no", data_no);
    if (data_zone) {
      formData.append("data_zone", data_zone);
    }

    try {
      const response = await axios.post(
        "https://maupedia.com/api/game-feature",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from game-feature: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async gameValidation(game, id, zone = "") {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("game", game);
    formData.append("id", id);
    if (zone) {
      formData.append("zone", zone);
    }

    try {
      const response = await axios.post(
        "https://maupedia.com/api/game-validation",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from game-validation: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async deposit(method, quantity, sender = "") {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "request");
    formData.append("method", method);
    formData.append("quantity", quantity);
    if (sender) {
      formData.append("sender", sender);
    }

    try {
      const response = await axios.post(
        "https://maupedia.com/api/deposit",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from deposit: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async checkDepositStatus(trxid) {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "status");
    formData.append("trxid", trxid);

    try {
      const response = await axios.post(
        "https://maupedia.com/api/deposit",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from deposit: ${error.response ? error.response.data : error.message}`,
      );
    }
  }

  async cancelDeposit(trxid) {
    const sign = this.generateSign();
    const formData = new FormData();
    formData.append("key", this.apiKey);
    formData.append("sign", sign);
    formData.append("secret", this.secretKey);
    formData.append("type", "cancel");
    formData.append("trxid", trxid);

    try {
      const response = await axios.post(
        "https://maupedia.com/api/deposit",
        formData,
        {
          headers: formData.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Error from deposit: ${error.response ? error.response.data : error.message}`,
      );
    }
  }
}

export default MaupediaAPI;
