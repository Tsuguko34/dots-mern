import React, { useEffect, useState } from 'react'

import '../../styles/login_and_registration.css'

import toast, { Toaster } from 'react-hot-toast'
import { 
  Box,
  Container,
  CssBaseline, 
  Grid, 
  IconButton, 
  InputAdornment, 
  OutlinedInput, 
  Paper, 
  TextField, 
  Typography
} from '@mui/material'

import { 
  Button,
  FormControl 
} from '@mui/base'

import { 
  Visibility, VisibilityOff 
} from '@mui/icons-material'

import { 
  Link, useNavigate 
} from 'react-router-dom'

import cictlogo from '../../assets/images/cict-logo.png'
import bulsuLogo from '../../assets/images/bulsuLogo.png'
import dotsIllustration from '../../assets/images/dotsIllustration.png'

import { 
  Typewriter
} from 'react-simple-typewriter'

import { 
  logInUser, 
  useDotsContext, 
  validateUser
} from '../../context'

import Swal from 'sweetalert2'

import { 
  LoadingGear 
} from '../../assets/svg'

import * as IoIcons from 'react-icons/io'


function Registration() {
  const navigate = useNavigate()
  const [loginCredentials, setLoginCredentials] = useState({email: '', password: ''})
  const [error, setError] = useState({ isError: false, errorMessage: '' })
  const [submit, setSubmit] = useState(false)

  const handleSubmit = async(e) => {
    e.preventDefault()
    setSubmit(true)
    const res = await logInUser({email: loginCredentials.email, password: loginCredentials.password})
    

    if(res?.status === 200){
      setSubmit(false)
      // If user is Active
      if(res.data?.active === 1){
        // If user is verified
        if(res.data?.verified === 1){
          //If account is Temporary
          if(res.data?.temporary === 0 || res.data?.temporary === null){
            console.log(true);
            Swal.fire({
              icon:'success',
              text:'Logged In Successfully.',
              showCancelButton: false,
              showConfirmButton: false,
              timer: 1000
            }).then(() => {
              window.localStorage.setItem('isLoggedIn', true)
              window.localStorage.setItem('user', res.data?.token)
              window.localStorage.setItem('profile', JSON.stringify(res.data))
              navigate('/Dashboard')
            })
          }
          else{

          }
        }
        else
        {
          Swal.fire({
            text:'This account has yet to be verified.',
            showCancelButton: false,
            showConfirmButton: true,
            confirmButtonText: 'Ok, close',
            confirmButtonColor: '#FF9944'
          })
        }
        
      }
      else{
        Swal.fire({
          text:'This account has been deactivated.',
          showCancelButton: false,
          showConfirmButton: true,
          confirmButtonText: 'Ok, close',
          confirmButtonColor: '#FF9944'
        })
      }
      
    }

    if(res?.status === 400){
      setSubmit(false)
      setError({ isError: 'true', errorMessage: res.errorMessage })
      setLoginCredentials({ ...loginCredentials, password: '' })
    }

  }


  // Hide Show Password
  const [showPassword, setShowPassword] = useState([{ show: false, for: ''}])

  const handleClickShowPassword = (props) =>  {
    if(showPassword.some(showPass => showPass.for === props)){
      setShowPassword(prev => prev.filter(showPass => showPass.for !== props));
    }
    else{
      setShowPassword(prev => [ ...prev, { show: true, for: props }])
    }
    
  }
  const handleMouseDownPassword = (event) => {
    event.preventDefault()
  }

  useEffect(() =>{
    document.title = "Registration"

    async function validate(){
      const isLoggedIn = window.localStorage.getItem('isLoggedIn')
      const token = window.localStorage.getItem('user')
      Swal.fire({
        title: 'Please wait...',
        allowEscapeKey: false,
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen:async() => {
          Swal.showLoading()
          
          if(isLoggedIn){
            const res = await validateUser({token})
            if(res?.status === 200){
              Swal.fire({
                icon:'success',
                text:'Logged In Successfully.',
                showCancelButton: false,
                showConfirmButton: false,
                timer: 1000
              }).then(() => {
                document.cookie = `token=${token}; path=/`
                navigate('/Dashboard')
              })
              
            }
          }
          else {
            Swal.close()
            document.cookie = 'token=; Max-Age=0; secure'
          }
        }
      })
      

      
      
    }

    validate()
  }, [])

  return (
    <section id='login_and_registration' className='login_and_registration'>
      <Toaster position="bottom-center"/>
      <div className="wrapper">
        <div className="side_illustration">
          <img src={dotsIllustration} alt="" />
          <div className="side_illustration_labels">
            <h1>Dean's Office Transaction System</h1>
            <p>In publishing and graphic design, Lorem ipsum is a placeholder</p>
          </div>
        </div>
        {/* Login Form */}
        <div className="form_wrapper">
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }} className='login_form'>
            <div className="login_and_registration_logos">
              <img src={bulsuLogo} alt="bulsuLogo" />
              <img src={cictlogo} alt="cictLogo" />
            </div>
            <div className="login_and_registration_header">
              <h3>Sign up</h3>
              <p>Enter your credentials below to create an account.</p>
            </div>
            <div className="Input_Group">
              <span className='Input_Label'>Email</span>
              <div className="Custom_Email">
                  <input className='Input' type="email" placeholder='Email Address' onChange={(e) => setLoginCredentials({...loginCredentials ,email: e.target.value})}/>
              </div>
            </div>
            <div className="Input_Group">
              <span className='Input_Label'>Password</span>
              <div className="Custom_Password">
                  <input 
                    className='Input' 
                    type={showPassword.some(showPass => showPass.for === "Password") ? 'text': 'password'}
                    placeholder='Password' 
                    onChange={(e) => setLoginCredentials({...loginCredentials ,password: e.target.value})}/>
                  <div className="Icon" onClick={() => handleClickShowPassword("Password")}>
                    {showPassword.some(showPass => showPass.for === "Password") ? <IoIcons.IoMdEyeOff size={'25px'}/>: <IoIcons.IoMdEye size={'25px'}/>}
                  </div>
              </div>
            </div>
            <div className="Input_Group">
              <span className='Input_Label'>Confirm Password</span>
              <div className="Custom_Password">
                  <input 
                    className='Input' 
                    type={showPassword.some(showPass => showPass.for === "Confirm Password") ? 'text': 'password'}
                    placeholder='Confirm Password' 
                    onChange={(e) => setLoginCredentials({...loginCredentials ,password: e.target.value})}/>
                  <div className="Icon" onClick={() => handleClickShowPassword("Confirm Password")}>
                    {showPassword.some(showPass => showPass.for === "Confirm Password") ? <IoIcons.IoMdEyeOff size={'25px'}/>: <IoIcons.IoMdEye size={'25px'}/>}
                  </div>
              </div>
            </div>
            {/* {isDisabled ? <Typography component="div" sx={{display: "flex", justifyContent: "center", alignItems: "center", color: "red"}}>
                {loginAttempts} Attempts failed. Please wait for {remainingTime}
            </Typography>: ""} */}
            {error.isError && (
              <Typography sx={{display: "flex", justifyContent: "center", alignItems: "center", color: "red", marginTop: "20px"}}>
                {error.errorMessage}
              </Typography>
            )}
            
            <Button
                disabled={submit}
                type="submit"
                variant="contained"
                className='login_button'
                style={{ backgroundColor: submit && '#e0853b' }}
            >
                {submit ? <LoadingGear width='40px' height='40px'/> : 'Sign Up'}
            </Button>
            <Box sx={{width: '100%', display: 'flex', justifyContent: "center", alignItems: "center"}} >
              <Typography sx={{color:  "#212121"}} className='signUp_Login_toggle'>
                Already have an account?&nbsp; 
              </Typography>
              <Link to={"/Login"} variant="body2" sx={{cursor: "pointer", "&:hover" : {color: "#FF647F"}, transition: "150ms"}} className='signUp_Login_toggle'>
                  Sign In
              </Link>
            </Box>
          </Box>
        </div>
        
      </div>
      
      
    </section>
  )
}

export default Registration