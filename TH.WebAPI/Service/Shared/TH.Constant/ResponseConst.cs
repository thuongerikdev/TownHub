using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TH.Constant
{
    public static class ResponseConst
    {
        // Success
        public static ResponseDto<T> Success<T>(string message, T data = default)
        {
            return new ResponseDto<T>
            {
                ErrorCode = 200,
                ErrorMessage = message,
                Data = data
            };
        }

        // Error
        public static ResponseDto<T> Error<T>(int errorCode, string message)
        {
            return new ResponseDto<T>
            {
                ErrorCode = errorCode,
                ErrorMessage = message,
                Data = default
            };
        }
    }

    // Generic DTO
    public class ResponseDto<T>
    {
        public int ErrorCode { get; set; }
        public string ErrorMessage { get; set; }
        public T Data { get; set; }
    }
}
