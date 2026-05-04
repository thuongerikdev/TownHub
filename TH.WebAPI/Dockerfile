# --- Base runtime (ASP.NET) ---
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# --- Build stage (SDK) ---
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# copy csproj để restore (đường dẫn tính từ context: TH.WebAPI)
COPY ["TH.WebAPI/TH.WebAPI.csproj", "TH.WebAPI/"]
COPY ["Service/Auth/TH.Auth.ApplicationService/TH.Auth.ApplicationService.csproj", "Service/Auth/TH.Auth.ApplicationService/"]
COPY ["Service/Shared/TH.Constant/TH.Constant.csproj", "Service/Shared/TH.Constant/"]
COPY ["Service/Shared/TH.Shared.ApplicationService/TH.Shared.ApplicationService.csproj", "Service/Shared/TH.Shared.ApplicationService/"]
COPY ["Service/Auth/TH.Auth.Domain/TH.Auth.Domain.csproj", "Service/Auth/TH.Auth.Domain/"]
COPY ["Service/Auth/TH.Auth.Dtos/TH.Auth.Dtos.csproj", "Service/Auth/TH.Auth.Dtos/"]
COPY ["Service/Auth/TH.Auth.Infrastructure/TH.Auth.Infrastructure.csproj", "Service/Auth/TH.Auth.Infrastructure/"]
COPY ["Service/Base/TH.Base.ApplicationService/TH.Base.ApplicationService.csproj", "Service/Base/TH.Base.ApplicationService/"]
COPY ["Service/Base/TH.Base.Domain/TH.Base.Domain.csproj", "Service/Base/TH.Base.Domain/"]
COPY ["Service/Base/TH.Base.Dtos/TH.Base.Dtos.csproj", "Service/Base/TH.Base.Dtos/"]
COPY ["Service/Base/TH.Base.Infrastructure/TH.Base.Infrastructure.csproj", "Service/Base/TH.Base.Infrastructure/"]
RUN dotnet restore "TH.WebAPI/TH.WebAPI.csproj"

# copy toàn bộ source rồi build
COPY . .
WORKDIR "/src/TH.WebAPI"
RUN dotnet build "TH.WebAPI.csproj" -c $BUILD_CONFIGURATION -o /app/build

# --- Publish ---
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "TH.WebAPI.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# --- Final image ---
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# HTTP-only trong container
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "TH.WebAPI.dll"]