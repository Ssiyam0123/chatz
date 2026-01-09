import  axios  from "axios";
import { ENV } from "./env.js";

export const axiosInstance = axios.create({
    baseURL : ENV.BASE_URL,
    withCredentials : true
})